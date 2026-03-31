# Form State Node Design

FormStateNode is the runtime representation of a single node in the form definition tree. It bridges a `ControlDefinition` (what to render) with a `SchemaDataNode` (the data context). Each node manages reactive state for visibility, disabled, readonly, validation, children, and the resolved definition.

## Design Principles

1. **Reactive state is explicit** — reactive properties are exposed as raw `Control<T>` instances, not hidden behind getters
2. **ReadContext-aware accessors** — convenience methods take a `ReadContext` and return plain snapshots, subscribing the caller to exactly the right controls
3. **Two modes of interaction** — "setting up reactivity" (work with raw controls) vs "reading inside a reactive context" (use `rc`-based accessors)
4. **Proxy is ephemeral** — override/script proxies are created per `ReadContext` call, not cached. They're stateless lenses, not reactive objects

## Interface

All reactive state lives in a single `stateControl: Control<FormStateNodeState>`. This gives one cleanup scope, one structural tree, and consistent access patterns — internal wiring uses `stateControl.fields.*` directly, and `rc`-based accessors read through those same child controls.

```typescript
interface FormStateNodeState {
  visible: boolean | null;
  disabled: boolean;
  readonly: boolean;
  children: FormStateNodeState[];
  dataNode: SchemaDataNode | undefined;
  busy: boolean;
  childIndex: number;
}

interface FormStateNode {
  readonly stateControl: Control<FormStateNodeState>;

  // The base definition — takes a ReadContext so it can read reactively
  // from a Control<ControlDefinition> in editor mode, or just return
  // the static definition in normal mode.
  getBaseDefinition(rc: ReadContext): ControlDefinition;

  // ── ReadContext-aware accessors (for use inside computeds/effects) ──

  /** Read the full state through a ReadContext, subscribing to all accessed fields */
  getState(rc: ReadContext): FormStateNodeState;

  /**
   * Returns the resolved definition with script overrides applied.
   * Creates an ephemeral proxy bound to the given ReadContext —
   * property reads subscribe the caller to:
   *   - the script override control (if a script exists for that property)
   *   - the base definition control (if in editor mode)
   *   - falls through to the static definition value otherwise
   */
  getDefinition(rc: ReadContext): ControlDefinition;

  // ── Lifecycle ──
  cleanup(): void;
}
```

The `children` array is `FormStateNodeState[]` — at the control level, `stateControl.fields.children` is a `Control<FormStateNodeState[]>`, and each element is a `Control<FormStateNodeState>`. The `FormStateNode` wrapper for each child is stored on the element control's `meta`. This keeps the data shape clean (no `Control` references in values) while the control tree still provides structure change notifications and cascading cleanup.

`getState(rc)` returns a proxy over `stateControl` that reads each field through the `ReadContext` — the caller only subscribes to the specific fields they actually access:
```typescript
getState(rc: ReadContext): FormStateNodeState {
  // Returns a proxy where property access does rc.getValue(stateControl.fields[prop])
  return createReadProxy(this.stateControl, rc);
}
```

## Definition Resolution Layers

When `getDefinition(rc)` is called, it returns a proxy that resolves property access through up to three layers:

1. **Script override layer** — checks the script layer's override controls via `rc`. Script computeds cache their results in these controls (e.g. a `hidden` script writes its result into `overrides.fields.hidden`). Reading through `rc` subscribes the caller to the cached result.

2. **Editor layer** (optional) — if the base definition is backed by a `Control<ControlDefinition>` (e.g. in a form editor's preview mode), property access reads through `rc`, subscribing to editor changes.

3. **Static fallback** — plain property access on the original `ControlDefinition` object. No subscription.

The proxy is created fresh per `getDefinition(rc)` call — it holds no state and needs no cleanup. It's just a lens that routes reads through the `ReadContext`.

## Script Override Lifecycle

Script computeds are the only part of the definition resolution that has lifecycle.

**Important:** The override controls are **not part of `FormStateNodeState`**. They are an internal implementation detail of the script layer, owned and managed separately. This avoids the problem of stale `_fields` children accumulating when scripts are torn down and recreated (e.g. when the definition changes in editor mode).

The script layer creates a fresh `Control<Record<string, any>>` for the overrides and a list of cleanup functions for the script computeds. When the base definition changes, the entire set is torn down — override control and all — and rebuilt from scratch. `getDefinition(rc)` holds an internal reference to the current override control.

```
Script layer (internal to FormStateNode, not in stateControl)
  └─ overrides: Control<Record<string, any>>  (recreated on definition change)
       ├─ computed: evaluate "hidden" script → write result to overrides.fields.hidden
       ├─ computed: evaluate "disabled" script → write result to overrides.fields.disabled
       └─ computed: evaluate "label" script → write result to overrides.fields.label
```

- Script computeds are created during `initFormState()`, with cleanup registered on the FormStateNode
- Each script computed tracks its own dependencies (data controls referenced by the expression) and writes its cached result into the corresponding override control
- When a dependency changes, only that script re-evaluates
- On cleanup, all script computeds are torn down (unsubscribe from dependencies)

**Editor mode coarse invalidation:** When the base definition is a `Control<ControlDefinition>` (editor mode), a single tracked computation reads the entire definition. If any property changes, the override control is discarded, a fresh one is created, and all script computeds are rebuilt. This is acceptable — editor preview doesn't need fine-grained reactivity.

## Computed Properties

These are set up as `computed()` instances during initialization, scoped to the FormStateNode:

- **dataNode** — `computed` that looks up the field path from the resolved definition in the parent `SchemaDataNode`
- **visible** — `computed` combining: parent visibility cascade, force-hidden flag, data node validity, definition's `hidden` property (via `getDefinition`)
- **disabled** — `computed` combining: parent cascade, force-disabled flag, definition property
- **readonly** — `computed` combining: parent cascade, force-readonly flag, definition property

## Sync Effects

Effects that keep the FormStateNode and its data control in sync:

- disabled → pushed to the data control
- touched ↔ bidirectional sync with the data control
- errors ← pulled from the data control
- default value logic: clear data when hidden, apply default when visible and undefined

## Children Lifecycle

Children are managed by an effect on `stateControl.fields.children`:

1. `resolveChildren()` determines the child specs (from form node children, array elements, or field options)
2. Children are cached by `childKey` for identity stability across re-evaluations
3. If the parent data context changes, the cache is cleared — entire subtree rebuilds
4. Detached children get `cleanup()` called immediately
5. Each child is a new `FormStateNode` with its own scope, computed properties, and sync effects

## Cleanup Chain

```
FormStateNode.cleanup()
  ├─ stateControl.cleanup()
  │    ├─ All computed properties stop tracking (visible, disabled, readonly, dataNode)
  │    ├─ All sync effects unsubscribe (disabled sync, touched sync, error sync, defaults)
  │    ├─ Children elements cleaned up recursively (each child's stateControl)
  │    └─ Validation effects torn down
  └─ Script layer cleanup
       ├─ All script computeds unsubscribe
       └─ Override control discarded
```

## Cascade Rules

- **Visibility, disabled, readonly** cascade down — if parent is hidden, all descendants are hidden
- **Errors** bubble up through the data control tree (not the form state tree)
- **Data context** can switch when entering array elements or compound fields — each child resolves its data node relative to its parent's data context