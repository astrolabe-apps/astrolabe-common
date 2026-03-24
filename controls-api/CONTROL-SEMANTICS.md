# Control Tree Semantics

Reference document for clean-room implementation. Extracted from `astrolabe-controls` source.

## Implementation Split

Each section is tagged to indicate where it lives:

- **`[core]`** — Implemented in `@astroapps/controls`. No globals, no React dependency. `ControlContext` is the central object providing `newControl()`, `update()`, read context creation, and tree-level configuration (equality). Mutations go through `WriteContext` (which uses `NotifyFn` internally). Reads are snapshot-only (`*Now` properties) or via `ReadContext`.
- **`[react]`** — Implemented in `@astroapps/controls-react`. Clean React adapter. Contains only the `controls()` wrapper that bridges core's `ReadContext`/`WriteContext` to React's render lifecycle. Depends on `[core]` but NOT `[patch]`.
- **`[patch]`** — Implemented by `@react-typed-forms/core` monkey-patching `Control`. Adds reactive property getters (`.value`, `.touched`, etc.) with implicit `collectChange` tracking, direct mutation methods on `Control` (`.setValue()`, `.setError()`, etc.), global transaction machinery (`runTransaction`, `groupedChanges`, `runPendingChanges`), all existing hooks, and form components.

The `[patch]` package may optionally depend on `[react]` to reuse clean React primitives (e.g. `controls()`), but `[react]` does NOT depend on `[patch]`. Both can coexist on the same control tree. The underlying **semantics** are identical — the patch and the react adapter are alternative entry points to the same core operations.

## Tree Structure

A control tree is a hierarchy of nodes. Each node holds:
- `value`, `initialValue` — the data
- `flags` — Touched, Disabled, ChildInvalid, DontClearError
- `errors` — `Record<string, string>` or undefined
- `fields` — named children (object controls), lazily created
- `elems` — indexed children (array controls), lazily created
- `parents` — back-references: `{ control, key, origKey? }[]`

Children are created lazily on first access. A control may have multiple parents (shared children).

## A. Value Equality `[core]`

Equality checks use a deep equals by default:
- `null`/`undefined`: `a == null ? a === b` (both null and undefined are "null")
- Objects: constructor must match, then recursive deep equals on entries
- Special handling for `Map`, `Set`, arrays, and NaN (`a !== a && b !== b`)

Equality is configured at the tree level via `ControlContext` (not per-control). All controls created by a context share the same equality function. `@react-typed-forms/core` provides a default context with `deepEquals` behind its standalone `newControl()` function.

## B. Value Propagation (Downward) `[core]`

When a parent's value is set:

1. Equality check — if equal, stop
2. Store new value
3. If not DontClearError, clear own errors (via `setErrors(null)`)
4. **Sync existing fields down**: for each already-created field `k`, set `child.value = parentValue[k]` (with `from=parent` to prevent upward bounce)
5. **Sync existing elements down**: reuse/create/trim element children to match new array length. Existing children get their values updated. New children are created. Surplus children are detached.
6. Propagate to parents (upward, see C)
7. Notify subscribers: Value change (+ Structure if null transition)

**Structure change**: flagged when value transitions between null/non-null, or when array length changes.

**Important**: Only already-created children are synced. Uncreated fields pick up correct values lazily when first accessed.

**Null parent materialisation**: Accessing a field on a null parent lazily creates a child with `undefined` value — this is construction only, no upward propagation occurs, and the parent stays null. When a child's value is actually *set* to something new, `childValueChange` fires. Upward propagation shallow-copies the parent via `copy()`, which creates `{}` (or `[]` for arrays) when the parent is null, then inserts *only the changed child's key*. Other lazily-created children with `undefined` values do NOT appear as keys in the parent — `copy()` copies from the parent's value, not from the set of existing children. Example: access `fields.a` and `fields.b` on a null parent, then set A to `"hello"` → parent becomes `{ a: "hello" }` (no `b` key). Setting B to `"world"` later → parent becomes `{ a: "hello", b: "world" }`.

### isNull

`isNull` uses `== null` (loose equality), so both `null` and `undefined` are considered null. Tracked as a Structure change for subscription purposes.

### markAsClean `[core]`

Sets `initialValue = value` via the normal initialValue propagation path. This makes `dirty` false for the control and propagates the new initialValue down to existing children.

### setValue callback form `[patch]`

`setValue(cb)` calls `cb(current.value)` synchronously and uses the return value as the new value. The callback runs before any transaction — it's just a convenience for read-modify-write.

### setValueAndInitial `[patch]`

Batched in a single `groupedChanges` transaction — both value and initialValue are set together, subscribers notified once after both complete.

## C. Value Propagation (Upward) `[core]`

When a child's value changes:

1. For each parent (except `from`):
   - Shallow-copy the parent's value (spread object or array)
   - Overwrite the child's key with the new child value
   - Set the parent's value to the copy

**Loop prevention**: Two mechanisms:
- `from` parameter: child skips the parent that triggered it
- Equality check: when parent pushes the same value back to the originating child, the equality check at the top exits early

## D. Initial Value Propagation `[core]`

**Downward only** — no upward propagation.

When initialValue is set:
1. Equality check
2. Store new initialValue
3. Sync to existing field children: `child.initialValue = parentInitialValue[k]`
4. Sync to existing element children: same pattern as value sync but for initialValue
5. Notify subscribers: InitialValue change

Dirty = `!isEqual(value, initialValue)`. Dirty change detection is computed lazily by `getChangeState()` during listener notification.

## E. Field Creation (Lazy) `[core]`

On `control.fields.someField` (first access):

1. If already cached, return
2. Extract `value[fieldName]` and `initialValue[fieldName]` (undefined if parent null or key missing)
3. Inherit Disabled + Touched flags from parent
4. Create child with field-specific setup (validator, equals, nested fields) if configured
5. Set parent link: `{ control: parent, key: fieldName }` (no origKey for fields)
6. Run init (validators, eager sub-fields, afterCreate)
7. Cache in fields map

## F. Element Creation and Sync `[core]`

### First access

Creates element children from the parent's value array. Each element gets:
- value from `parentValue[i]`, initialValue from `parentInitialValue[i]`
- Inherited Disabled + Touched flags
- Parent link with `key=index, origKey=index` (initial=true)

### Sync on value change (parent value set)

Reuses existing children by index:
- **Existing children** (index < old length): update value (with `from=parent`), DON'T update initialValue
- **New children** (index >= old length): create fresh
- **Surplus children** (old length > new length): detach parent link

### Sync on initialValue change (parent initialValue set)

- **Existing children**: update initialValue + re-key origKey, DON'T update value
- **New children**: create fresh
- **Surplus**: detach

### Array mutations (add/remove/update elements)

`updateElements(control, cb)`:
1. Get old elements, compute new elements via callback
2. Detach removed elements (clear parent link)
3. Re-key all new elements to their new indices
4. Clear ChildInvalid, propagate validity
5. Reconstruct parent value from element values
6. Signal Structure change

### origKey tracking

- `key`: current index (updated on reorder)
- `origKey`: index when element was part of initial value (set when `initial=true`)

## F′. Value Type Changes (object ↔ array ↔ primitive) `[core]` — **PROPOSAL**

A control's value may change from one structural type to another (e.g. object → array, array → primitive, primitive → object). Fields and elements have different semantics under type changes:

### Fields are sticky

Fields are accessed by explicit name (developer intent). When the parent value changes to a type where `value[key]` yields `undefined` (e.g. a primitive or an array without that key), existing field children simply receive `undefined` as their value via the normal downward sync (section B step 4). They remain linked to the parent.

If the value later becomes an object with that key again, the field picks up the correct value through the same sync path. No special handling is needed — the existing propagation rules already produce the right result.

### Elements are transient

Elements are positional (derived from data, not developer intent). When the parent value stops being an array:

1. `syncElementsOnValueChange` checks `Array.isArray(newValue)`
2. If not an array, treat as empty array: all existing elements are detached (surplus children logic from section F) and `_elems` is cleared
3. If the value later becomes an array again, fresh elements are created lazily on next access

This means a cycle like `object → array → object` detaches all elements on the first transition, creates fresh ones for the array, then detaches them again. No stale element references survive a type change.

### InitialValue type changes

Same rules apply: fields get `initialValue[key]` (undefined if not indexable), elements are trimmed to 0 if initialValue is not an array.

## G. Touched/Disabled Propagation `[core]`

**Cascade downward by default.** `notChildren` parameter opts out.

- `setTouched(touched, notChildren?)`: set/clear flag, recurse to existing children unless notChildren
- `setDisabled(disabled, notChildren?)`: same pattern

**At child creation**: Disabled and Touched flags inherited from parent. ChildInvalid and DontClearError are NOT inherited.

## H. Error/Validity Propagation `[core]`

### Setting errors

- `setError(key, error)`: set/remove a single keyed error. Early return if value unchanged. When removing the last error, `_errors` becomes `undefined` (not empty object). Propagates validity upward only if error *presence* changes (had errors → no errors, or vice versa), not on every error value change.
- `setErrors(errors)`: bulk replace. Filters out null/undefined values from the input. Compares via deepEquals against current errors — only propagates if the resulting error object actually changed. `null`/empty input results in `undefined` errors (not empty object).
- `clearErrors()`: recurse to all existing children first, then clear own errors via `setErrors(null)`

### Validity propagation (upward)

When a child's error presence changes (had errors -> no errors, or vice versa):
1. For each parent:
   - If child has errors AND parent already has ChildInvalid: skip (optimization)
   - Otherwise: set/clear parent's ChildInvalid flag in a transaction
   - Continue up the tree recursively

### isValid()

1. Own errors? -> false
2. ChildInvalid flag? -> false (fast path)
3. Call childrenValid() — checks all existing children recursively
4. If any child invalid, set ChildInvalid flag (cache for next time)

**Note**: Only checks existing (already-created) children. Uncreated fields with validators aren't considered until accessed.

## I. Transaction Batching

Batching exists in two forms with identical semantics:

### Core batching (`WriteContext`) `[core]`

`WriteContext` owns a `pending: Set<ControlImpl>` and a `NotifyFn` callback. Mutations on `ControlImpl` accept `NotifyFn` — when a mutation causes a change, it calls `notify(this)` to add itself to the pending set. After the callback completes, `WriteContext.flush()` drains the pending set, running listeners. Listeners may cause further mutations (via the same `WriteContext`), adding more controls to the pending set — the drain loop continues until settled. `afterChanges` callbacks run after all listeners have drained.

No global state. Each `ControlContext.update()` call creates a fresh `WriteContext`. This is also what `@astroapps/controls-react`'s `controls()` wrapper uses — the `update` function passed to components calls `ControlContext.update()` directly.

### Global batching (`runTransaction` / `groupedChanges`) `[patch]`

The monkey patch adds module-level transaction state for the legacy API:

**runTransaction(control, fn)**:
1. Increment global transaction count
2. Run mutation callback — **errors are caught, logged to console, and execution continues** (does not throw)
3. If nested (count > 1): queue control for later listener run
4. If outermost (count = 1): run listeners now (fast path if only this control) or drain queue

**groupedChanges(fn)**: Increment count, run callback, decrement, drain. Individual mutations inside handle their own queueing.

**Drain loop (runPendingChanges)**:
While count=0 and items pending:
1. Enter temp transaction (count=1) to prevent re-entrance
2. Priority: run queued listeners before afterChanges callbacks
3. Snapshot queue, clear it, run all
4. Loop continues if running listeners queued new items

**afterChanges callbacks**: A separate queue of callbacks that run after all listener notifications have drained. Listeners always have priority — afterChanges callbacks only run when the listener queue is empty.

## J. Control Setup (Validators) `[core]`

During init (`attach` / `initControl`), in this order:

1. **Validator**: if configured:
   - Run immediately (validate initial value), error stored under key `"default"`
   - Subscribe to `Value | Validate` changes for re-running
   - Set DontClearError flag (value changes don't auto-clear validator errors)

2. **Eager field creation**: for any field with a validator, create it now (triggers the field's own validator)

3. **Eager element init**: if element setup exists, create all element children now

4. **Meta**: copy metadata from setup

5. **afterCreate**: run user callback (runs after all other setup)

### DontClearError flag

Can be set two ways:
- Automatically when a validator is configured (see above)
- Explicitly via `ControlSetup.dontClearError` option

When set, value changes (section B step 3) do NOT auto-clear errors. This prevents validators from losing their error state when the value changes — the validator re-runs via its subscription and sets the appropriate error.

## K. Validate `[core]`

`wc.validate(control)` — imperatively triggers all validators in the subtree. Lives on `WriteContext` (not `Control`) because it needs a write batch to set errors.

1. Recurse: call validate on all existing children (depth-first)
2. Fire `ControlChange.Validate` to own subscribers — this re-runs any validator that subscribed to `Value | Validate` (see section I)
3. Return `isValid()` after listeners have run

Called from within an `update()` callback:
```typescript
update(wc => {
  const isValid = wc.validate(formControl);
});
```

This is how validators that were set up during init get re-triggered on demand (e.g. a "Validate" button). The `Validate` change flag is separate from `Value` — it lets validators distinguish between "value changed" and "explicit validation requested".

> **Legacy compat (`@react-typed-forms/core`):** The monkey-patch layer will add a convenience `control.validate()` method that creates its own write batch internally, matching the existing API.

## L. Computed Values `[core]`

`computed(ctx, target, compute)` — creates a reactive computation that tracks dependencies via `ReadContext` and writes the result to a target control. Returns a `SubscriptionReconciler` for lifecycle management.

```typescript
function computed<V>(
  ctx: ControlContext,
  target: Control<V>,
  compute: (rc: ReadContext) => V,
): SubscriptionReconciler
```

**Lifecycle:**
1. Creates a `TrackingReadContext` + `SubscriptionReconciler` internally
2. Initial run: reset tracker, execute `compute(rc)`, reconcile subscriptions, write result to `target` via `ctx.update()`
3. When a dependency changes: reconciler listener fires → re-runs compute, reconciles, writes new value
4. Returns the `SubscriptionReconciler` — caller manages lifecycle

**Disposal:**
- Non-React callers: call `reconciler.cleanup()` directly to unsubscribe all
- React callers: use `controlContext.markTrackerDead(reconciler)` / `reviveTracker(reconciler)` for strict mode safety (same pattern as `controls()` wrapper)

Built entirely on existing primitives (`TrackingReadContext`, `SubscriptionReconciler`, `ControlContext.update`). No new subscription mechanisms needed.

### React hook: `useComputed` `[react]`

Provided to `controls()` render functions via `ControlsContext`:

```typescript
const MyComponent = controls(function MyComponent({ items }, { rc, useComputed }) {
  const total = useComputed((rc) => {
    return rc.getElements(items).reduce((sum, el) => sum + rc.getValue(el), 0);
  });
  return <div>Total: {rc.getValue(total)}</div>;
});
```

Implementation wraps the core `computed()`:
1. `useRef` to hold target control + reconciler (created once)
2. Calls core `computed(ctx, target, compute)` — replaces previous computation
3. `useEffect` cleanup calls `markTrackerDead(reconciler)`; mount calls `reviveTracker(reconciler)` (strict mode safe)

> **Legacy compat (`@react-typed-forms/core`):** `useComputed(compute)` and `updateComputedValue(control, compute)` delegate to core `computed()`, storing the reconciler on `control.meta` for idempotent replacement.

## L′. Effects `[core]`

`effect(ctx, fn)` — creates a reactive effect that tracks dependencies and re-runs on changes. Like `computed` but for side effects — no target control, no return value written.

```typescript
function effect(
  ctx: ControlContext,
  fn: (rc: ReadContext) => (() => void) | void,
): SubscriptionReconciler
```

- Same tracking/reconcile lifecycle as `computed`
- If `fn` returns a cleanup function, it's called before each re-run and on dispose
- Returns `SubscriptionReconciler` for lifecycle management (same disposal patterns as `computed`)

### `asyncEffect` `[core]`

```typescript
function asyncEffect<V>(
  ctx: ControlContext,
  process: (rc: ReadContext, signal: AbortSignal) => Promise<V>,
  onResult: (value: V) => void,
): SubscriptionReconciler
```

- Tracking happens during `process()` execution (works across `await` boundaries since `ReadContext` is an explicit object, not a global)
- If deps change while in-flight: abort current (`AbortSignal`), queue one re-run (not N)
- `onResult` called with resolved value — typically calls `ctx.update()` to write results
- Returns `SubscriptionReconciler` for lifecycle management

## L″. Cleanup — candidate for removal

> **Note:** The existing `@react-typed-forms/core` library has `cleanup()` and `addCleanup()` on controls. With the new `computed`/`effect` APIs returning `SubscriptionReconciler` for explicit lifecycle management, and React integration using `markTrackerDead`/`reviveTracker`, control-level cleanup may no longer be needed. The caller owns disposal, not the control.

Previous semantics (for reference):
- `cleanup()`: run registered cleanup callbacks, then recurse into children that have exactly 1 parent (shared children survive)
- Parent links removed via `updateParentLink(parent, undefined)`

## M. Subscription Mechanics `[core]`

### Bitmask-based change detection

Each `Subscription` has a `mask` (which `ControlChange` flags it cares about) and a stored `changeState` (the last-seen state when the listener was notified or subscribed).

Changes fall into two categories:

1. **Flag-based changes** (Dirty, Valid, Touched, Disabled): detected at flush time by recomputing current boolean state via `getChangeState()` and XORing against the stored `changeState`. Only bits that actually flipped trigger listeners. This handles cases like dirty→clean→dirty within a batch (net no change, no notification).

2. **Event-style changes** (Value, InitialValue, Error, Structure): cannot be derived from current state alone. Mutations call `applyChange(change)` directly to set bits in `changeState`. At flush time, `runListeners()` picks these up via the same XOR mechanism.

### Subscribe

On `subscribe(listener, mask)`:
1. Lazily creates the `Subscriptions` object if this is the first subscription
2. Computes current state for flag-based changes via `getChangeState(mask)`
3. Stores this as the subscription's initial `changeState` so the first notification only fires on actual changes

### Property access tracking (collectChange) `[patch]`

The monkey patch adds reactive property getters to `Control` (`.value`, `.touched`, `.dirty`, `.disabled`, `.valid`, `.error`, `.errors`, `.elements`, `.isNull`). Each getter calls a global `collectChange?.(this, ControlChange.XXX)` before returning the snapshot value. This is how implicit dependency tracking works — the change collector records which `(control, changeFlag)` pairs were accessed during a render or effect.

The core library has NO `collectChange` — its `*Now` properties return snapshot values without side effects. The `ReadContext` handles explicit dependency tracking instead (see FUTURE-API-DESIGN.md).

### Explicit dependency tracking (tracking `ReadContext`) `[core]` used by `[react]`

`@astroapps/controls-react`'s `controls()` wrapper creates a tracking `ReadContext` per component instance. During render, each `rc.getValue(control)`, `rc.isDirty(control)`, etc. call records the `(control, ControlChange flag)` pair. After the render function returns, the tracked set is diffed against the previous subscription set and `subscribe`/`unsubscribe` are called to reconcile. On unmount, all subscriptions are cleaned up.

This is the explicit equivalent of `[patch]`'s `collectChange` global — same subscription primitives underneath, but scoped to a single component's tracking read context instead of a module-level variable. The exact implementation mechanism (e.g. a `SubscriptionTracker` class) is TBD.

## N. Array Mutation APIs `[core]`

### updateElements(control, cb)

The primary array mutation API. Takes a callback that receives the current element controls and returns the new element list:

1. Call `cb(oldElements)` to get new element list
2. Identify detached elements (in old but not in new)
3. Re-key all new elements to their new indices
4. Detach removed elements (clear parent link)
5. Clear ChildInvalid flag, propagate validity
6. Reconstruct parent value from element values
7. Signal Structure change
8. Return the detached elements

### addElement(control, value, index?, insertAfter?)

Creates a new child element and inserts it at the given index (or appends if no index). The `index` parameter can be a numeric index or a `Control` reference (resolved to its position in the array). When `insertAfter` is true, the element is inserted after the given index rather than before it. Delegates to `updateElements` internally.

### newElement(control, value)

Creates a child control with the given value (value and initialValue both set to it) but does NOT add it to the parent. Used to create elements that are later added via `updateElements`.

## O. Utility APIs `[core]`

All utility functions are standalone (not methods on `Control`) to keep the `Control` interface minimal. They access internal `_parents` data where needed.

### lookupControl(control, path)

`lookupControl(control: Control<any>, path: (string | number)[]): Control<any> | undefined`

Traverses the control tree given an array of path segments. Strings are treated as field keys, numbers as element indices. Returns `undefined` if any segment fails to resolve. Uses snapshot reads only (no tracking).

### getControlPath(control, untilParent?)

`getControlPath(control: Control<any>, untilParent?: Control<any>): (string | number)[]`

Walks the `_parents` chain upward from `control`, collecting each `ParentLink.key`. Stops at the root (no parent) or at `untilParent` if provided. Returns the path segments in root-to-leaf order. Uses `_parents[0]` at each step (first parent link).

### getElementIndex(child, parent?)

`getElementIndex(child: Control<any>, parent?: Control<any[]>): { index: number; initialIndex: number | undefined } | undefined`

Returns the current index (`ParentLink.key`) and initial index (`ParentLink.origKey`) of an array element control. If `parent` is provided, finds the link to that specific parent; otherwise uses the first parent link. Returns `undefined` if the control has no parent link (detached).

### controlGroup(fields)

Creates a parent control from a map of `{ fieldName: Control }`. The parent's value is constructed from the children's values. Uses `setFields` internally.

### setFields(control, fields)

Merges new field controls into an existing control. Detaches all existing fields, attaches the new ones, then reconstructs the parent value and initialValue from the field values via `setValueAndInitial`.

## P. Monkey Patch Surface `[patch]`

Summary of everything `@react-typed-forms/core` adds to `Control`:

### Reactive property getters (read + track)

Added to `Control.prototype`. Each calls `collectChange?.(this, flag)` then returns the snapshot value:
- `.value` → `ControlChange.Value`
- `.initialValue` → `ControlChange.InitialValue`
- `.dirty` → `ControlChange.Dirty`
- `.touched` → `ControlChange.Touched`
- `.disabled` → `ControlChange.Disabled`
- `.valid` → `ControlChange.Valid`
- `.error` → `ControlChange.Error`
- `.errors` → `ControlChange.Error`
- `.elements` → `ControlChange.Structure`
- `.isNull` → `ControlChange.Structure`

### Property setters (write + transact)

- `.value = v` → `runTransaction(this, () => setValueImpl(v))`
- `.initialValue = v` → `runTransaction(this, () => setInitialValueImpl(v))`
- `.touched = b` → delegates to `setTouched(b)`
- `.disabled = b` → delegates to `setDisabled(b)`
- `.error = s` → delegates to `setError("default", s)`

### Direct mutation methods on Control

These wrap the core `ControlImpl` mutations with `runTransaction`:
- `setValue(cb)` — read-modify-write convenience
- `setValueAndInitial(v, iv)` — batched via `groupedChanges`
- `setInitialValue(v)`
- `setTouched(touched, notChildren?)`
- `setDisabled(disabled, notChildren?)`
- `setError(key, error?)`
- `setErrors(errors?)`
- `clearErrors()`
- `markAsClean()`

### `.current` property

Returns a `ControlProperties<V>` snapshot — same values as the `*Now` properties but through the legacy interface. Non-reactive (no `collectChange` call).

### Global functions

- `setChangeCollector(fn)` — set/clear the global change collector
- `runTransaction(control, fn)` — global batched mutation
- `groupedChanges(fn)` — batch multiple mutations
- `runPendingChanges()` — force drain the notification queue
- `addAfterChangesCallback(fn)` — queue a callback for after listeners settle
- `unsafeFreezeCountEdit(dir)` — directly manipulate transaction count (used by React render tracking)

## Q. Clean React Adapter Surface `[react]`

`@astroapps/controls-react` is intentionally minimal — just the React render lifecycle bridge:

### `controls(render)` / `controls(name, render)`

Wraps a render function with explicit `ReadContext`/`WriteContext` injection:

1. Gets `ControlContext` from React context
2. Creates a tracking `ReadContext` per component instance
3. On each render, calls the render function with `(props, { rc, update, controlContext })`
4. After the function returns, reconciles subscriptions
5. On unmount, cleans up all subscriptions
6. Component is wrapped with `React.memo`

### `useComputed` hook (via `ControlsContext`)

Passed to `controls()` render functions as part of `ControlsContext`. Wraps the core `computed()` primitive with React lifecycle management:

```typescript
const total = useComputed((rc) => rc.getValue(a) + rc.getValue(b));
// total is a Control<number> — read it reactively via rc.getValue(total)
```

Uses `useRef` internally (React hook rules apply). Strict mode safe via `markTrackerDead`/`reviveTracker`.

### Types

- `UpdateFn` — `(cb: (wc: WriteContext) => void) => void`
- `UseComputed` — `<V>(compute: (rc: ReadContext) => V) => Control<V>`
- `ControlsContext` — `{ rc: ReadContext; update: UpdateFn; controlContext: ControlContext; useComputed: UseComputed }`
- `ControlsRender<P>` — `(props: P, ctx: ControlsContext) => ReactNode`

### What's NOT here (yet)

Hooks (`useControl`, `useControlEffect`, `useValidator`, etc.), form components (`Finput`, `Fcheckbox`, `Fselect`), and render helpers (`RenderOptional`, `RenderElements`) remain in `@react-typed-forms/core` for now. The `controls()` pattern may enable a better API than hooks in future.

## Key Invariants

1. Value propagation is bidirectional, cycle-safe (from param + equality check)
2. InitialValue propagation is downward-only
3. Child creation is lazy, except fields with validators (eagerly created)
4. Disabled/Touched inherited at creation + cascade down on set
5. Validity propagates upward; isValid() lazily recomputes via childrenValid()
6. Transactions batch listener notifications to outermost boundary
7. ~~Cleanup is conditional on single-parent children~~ (candidate for removal — see section L)
8. Errors stored as `Record<string, string> | undefined` — never an empty object
9. `isNull` uses loose equality (`== null`) — both null and undefined are "null"
10. Transaction errors are caught and logged, never thrown — the drain loop always completes