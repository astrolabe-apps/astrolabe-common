# controls-api

A standalone experimental Next.js project for prototyping and validating a new controls API design. This project serves as a sandbox to iterate on the ideas below — building working implementations, testing React integration patterns, and answering the open questions — before bringing the design back into `@astroapps/controls`.

## API Design: Explicit Reactivity & Write Context

This document captures a proposed future direction for `@astroapps/controls` that removes global variables and makes reactivity and writes explicit.

## Goals

- **No global variables** — no module-level state, no ambient dependency tracking
- **Explicit reactivity** — reading a control property only subscribes if you do it through a `ReadContext`
- **Explicit writes** — all mutations go through a `WriteContext` which controls when subscribers are notified
- **C# portability** — the design maps cleanly to C# interfaces without proxy/getter magic
- **React-agnostic core** — the core library (`Control`, `ReadContext`, `WriteContext`, subscription management) must have zero React dependency. React integration (`controls()` wrapper, hooks) lives in a separate layer that consumes well-defined primitives from the core. This enables use in Node/server contexts, testing without jsdom, and future framework adapters (Solid, Svelte, etc.)

## Package Architecture

Three independent packages with a shared core:

```
@astroapps/controls              (core, no React, no globals)
       ^                                ^
       |                                |
       |                     @astroapps/controls-react
       |                        (clean React adapter)
       |                        (depends on controls + react)
       |                                ^
       |                                | (optional)
       +------- @react-typed-forms/core -+
                (legacy compat, monkey-patch)
                (depends on controls + react, optionally controls-react)
```

`@react-typed-forms/core` may depend on `@astroapps/controls-react` to reuse clean React primitives (e.g. `controls()`) alongside its legacy API. Both packages can coexist on the same control tree because they share the same underlying `@astroapps/controls` subscription mechanism.

### `@astroapps/controls` (core)

Pure TypeScript, no React, no globals. Contains:
- `Control<V>` with `*Now` snapshot reads
- `ReadContext` / `WriteContext` interfaces
- `ControlContext` — tree-level configuration and factory for all core operations (see "ControlContext" below)
- `SubscriptionTracker`, subscription bitmask system (`ControlChange`, `Subscription`)
- All tree semantics (value propagation, lazy children, validity, etc.)
- `computed(ctx, target, compute)` — reactive computation built on `TrackingReadContext` + `SubscriptionReconciler`
- `effect(ctx, fn)` — reactive side effect with same tracking primitives
- `asyncEffect(ctx, process, onResult)` — async reactive effect with abort/dedup
- Standalone utility functions: `lookupControl`, `getControlPath`, `getElementIndex`

### `@astroapps/controls-react` (clean React adapter)

Thin React adapter. The `controls()` wrapper provides a `ControlsContext` (with `rc: ReadContext`, `update: UpdateFn`, `controlContext: ControlContext`, and `useComputed: UseComputed`) as the second argument to the render function. The `ControlContext` is obtained from React context. No globals, no build plugins required.

`useComputed` is a React hook (passed via context) that wraps core `computed()` with `useRef` lifecycle and `markTrackerDead`/`reviveTracker` for strict mode safety.

Depends on `@astroapps/controls` + `react`.

Hooks and form components remain in `@react-typed-forms/core` for now — the `controls()` pattern may enable a better API than hooks in future.

### `@react-typed-forms/core` (legacy compatibility)

Monkey-patches `@astroapps/controls` to add the implicit-reactivity API. Contains:
- Reactive property getters/setters (`.value`, `.touched`, etc.) with global `collectChange` tracking
- Direct mutation methods on `Control`
- Global transaction machinery (`runTransaction`, `groupedChanges`, `runPendingChanges`)
- `newControl()` standalone function — uses a default `ControlContext` instance (with `deepEquals`)
- `useComponentTracking()` and SWC/Babel plugin support
- All existing hooks (`useControl`, `useComputed`, `useControlEffect`, `useValidator`, etc.)
- Form components (`Finput`, `Fcheckbox`, `Fselect`) and render helpers

Re-exports everything from `@astroapps/controls`.

## Core Concepts

### Control (read-only data container)

`Control<V>` becomes a dumb data container. All property reads are non-reactive snapshots:

```typescript
interface Control<V> {
  readonly uniqueId: number

  // Snapshot reads (no subscription)
  readonly valueNow: V
  readonly initialValueNow: V
  readonly validNow: boolean
  readonly dirtyNow: boolean
  readonly touchedNow: boolean
  readonly disabledNow: boolean
  readonly errorNow: string | null | undefined
  readonly errorsNow: Record<string, string>
  readonly isNullNow: boolean

  // Structural navigation (not reactive — structure is fixed after init)
  readonly fields: ControlFields<V>

  // Subscriptions (same bitmask-based mechanism as current @astroapps/controls)
  subscribe(listener: ChangeListenerFunc, mask: ControlChange): Subscription
  unsubscribe(subscription: Subscription): void

  // Metadata
  meta: Record<string, unknown>
}
```

### ReadContext (reactive read context)

A `ReadContext` is an explicit reactive context. Reading through it registers a dependency:

```typescript
interface ReadContext {
  getValue<V>(control: Control<V>): V
  getInitialValue<V>(control: Control<V>): V
  isValid(control: Control<unknown>): boolean
  isDirty(control: Control<unknown>): boolean
  isTouched(control: Control<unknown>): boolean
  isDisabled(control: Control<unknown>): boolean
  isNull(control: Control<unknown>): boolean
  getError(control: Control<unknown>): string | null | undefined
  getErrors(control: Control<unknown>): Record<string, string>
  getElements<V>(control: Control<V[]>): Control<V>[]
}
```

Different `ReadContext` implementations have different strategies:

- **React render** — records `(control, property)` pairs during render, subscribes, re-renders on change
- **Effect** — re-runs a compute function when any dependency changes
- **Noop** — returns current values with no subscriptions (tests, one-shot reads)
- **Snapshot** — freezes values at a point in time

### WriteContext (explicit write context)

A `WriteContext` is the counterpart to `ReadContext`. All mutations go through it rather than on `Control` directly:

```typescript
interface WriteContext {
  // Value mutations
  setValue<V>(control: Control<V>, value: V): void
  updateValue<V>(control: Control<V>, cb: (current: V) => V): void
  setValueAndInitial<V>(control: Control<V>, value: V, initial: V): void
  setInitialValue<V>(control: Control<V>, value: V): void
  markAsClean(control: Control<unknown>): void

  // State mutations
  setTouched(control: Control<unknown>, touched: boolean, notChildren?: boolean): void
  setDisabled(control: Control<unknown>, disabled: boolean, notChildren?: boolean): void
  setError(control: Control<unknown>, key: string, error?: string | null): void
  setErrors(control: Control<unknown>, errors?: Record<string, string | null | undefined> | null): void
  clearErrors(control: Control<unknown>): void

  // Array mutations
  addElement<V>(control: Control<V[]>, child: V, index?: number | Control<V>, insertAfter?: boolean): Control<V>
  removeElement<V>(control: Control<V[]>, child: number | Control<V>): void
  updateElements<V>(control: Control<V[]>, cb: (elems: Control<V>[]) => Control<V>[]): Control<V>[]

  // Validation
  validate(control: Control<unknown>): boolean
}
```

`WriteContext` is transient — it only exists for the duration of a callback passed to `ControlContext.update()`. This ensures mutations are always batched and subscribers only run after all writes in a batch are complete.

### ControlContext (tree-level configuration and factory)

`ControlContext` is the central object in the core — it holds tree-level configuration and provides factory methods for creating controls, read contexts, and write contexts. There are no standalone `newControl()` or `update()` functions in the core; everything goes through a context:

```typescript
interface ControlContext {
  // Control creation
  newControl<V>(value: V, setup?: ControlSetup<V>): Control<V>

  // Write batching — creates a transient WriteContext, flushes after callback
  update(cb: (wc: WriteContext) => void): void

  // Read context creation — exact API TBD

  // Configuration
  readonly equals: (a: unknown, b: unknown) => boolean
}
```

Tree-level settings (configured on the context, not per-control):
- **Equality function** — used for value comparison across the entire tree (default: `deepEquals`)

The core provides `createControlContext(options?)` to create context instances. `@react-typed-forms/core` provides a default context and re-exports standalone convenience functions (`newControl`, `update`, etc.) for backward compatibility:

```typescript
// Core — explicit context
const ctx = createControlContext({ equals: deepEquals })
const control = ctx.newControl({ name: "", age: 0 })
ctx.update(wc => wc.setValue(control, { name: "Alice", age: 30 }))

// @react-typed-forms/core — convenience, uses default context
import { newControl, update } from "@react-typed-forms/core"
const control = newControl({ name: "", age: 0 })
```

## Contrast with Current API

| Concern | Current | Proposed |
|---------|---------|----------|
| Reactive read | `control.value` (implicit, magic) | `rc.getValue(control)` (explicit) |
| Snapshot read | `control.value` (ambiguous) | `control.valueNow` (unambiguous) |
| Mutation | `control.setValue(x)` (on Control) | `update(wc => wc.setValue(control, x))` (explicit, batched) |
| Subscriber notification | Module-level globals | `update()` flushes subscribers after callback completes |
| Dependency tracking | Global `collectChange` callback | `ReadContext` object, no globals |

## C# Alignment

All four interfaces map directly to plain C# interfaces — no proxy or getter magic needed:

```csharp
interface IControl<T> {
    int UniqueId { get; }
    T ValueNow { get; }
    T InitialValueNow { get; }
    bool ValidNow { get; }
    bool DirtyNow { get; }
    bool TouchedNow { get; }
    bool DisabledNow { get; }
    string? ErrorNow { get; }
    IReadOnlyDictionary<string, string> ErrorsNow { get; }
}

interface IReadContext {
    T GetValue<T>(IControl<T> control);
    T GetInitialValue<T>(IControl<T> control);
    bool IsValid(IControl control);
    bool IsDirty(IControl control);
    bool IsTouched(IControl control);
    bool IsDisabled(IControl control);
    string? GetError(IControl control);
    IReadOnlyDictionary<string, string> GetErrors(IControl control);
    IReadOnlyList<IControl<T>> GetElements<T>(IControl<IList<T>> control);
}

interface IWriteContext {
    void SetValue<T>(IControl<T> control, T value);
    void UpdateValue<T>(IControl<T> control, Func<T, T> cb);
    void SetValueAndInitial<T>(IControl<T> control, T value, T initial);
    void SetInitialValue<T>(IControl<T> control, T value);
    void MarkAsClean(IControl control);
    void SetTouched(IControl control, bool touched);
    void SetDisabled(IControl control, bool disabled);
    void SetError(IControl control, string key, string? error);
    void SetErrors(IControl control, IDictionary<string, string?>? errors);
    void ClearErrors(IControl control);
    IControl<T> AddElement<T>(IControl<IList<T>> control, T child, int? index = null);
    void RemoveElement<T>(IControl<IList<T>> control, IControl<T> child);
    bool Validate(IControl control);
}

interface IControlContext {
    IControl<T> NewControl<T>(T value);
    void Update(Action<IWriteContext> cb);
    // Read context creation — exact API TBD
}
```

## React Integration: `controls()` wrapper (`@astroapps/controls-react`)

The `controls()` wrapper, `UpdateFn`, `ControlsContext`, and `ControlsRender` types live in `@astroapps/controls-react`.

### Decision

Rather than a `useControls()` hook (which can't know when render finishes to finalize dependency tracking) or a Babel plugin (like `@react-typed-forms/transform`), components are wrapped with a `controls()` function. The render function receives two arguments: the component's own props, and a `ControlsContext` providing `rc` (ReadContext), `update` (write batching), and `controlContext` (the tree-level `ControlContext`):

```typescript
const MyForm = controls(function MyForm({ name }, { rc, update }) {
  const value = rc.getValue(name);
  return (
    <input
      value={value}
      onChange={(e) => update(wc => wc.setValue(name, e.target.value))}
    />
  );
});
```

The `ControlContext` is obtained from React context (not passed explicitly to `controls()`).

### Why `controls()` and not a hook

The problem with `const { rc, update } = useControls()` is that the `ReadContext` needs to know when the render function finishes executing so it can finalize the dependency set and subscribe. A hook runs at the top of the component but has no way to know when the return statement is reached. The Babel plugin (`@react-typed-forms/transform`) solved this by injecting try/finally around the component body, but we want to avoid build tooling dependencies.

`controls()` solves this naturally — it calls the wrapped function directly, so it knows exactly when it returns. At that point it has the complete set of `(control, property)` pairs that were read, and can diff against the previous set and update subscriptions.

### How it works

1. `controls()` returns a `React.memo` component
2. The `ControlContext` is obtained from React context
3. On each render, it creates/resets a tracking `ReadContext`, calls the inner function with `(props, { rc, update, controlContext })`
4. When the function returns, the dep set is complete
5. Deps are compared to the previous set; subscriptions are updated
6. When a tracked dependency changes, the component re-renders

### Component naming

`controls()` supports both named functions and an explicit string name to ensure components aren't anonymous in React DevTools:

```typescript
// Named function — displayName inferred from fn.name
const MyForm = controls(function MyForm(props, { rc, update }) { ... });

// Explicit string name
const MyForm = controls("MyForm", (props, { rc, update }) => ...);

// Anonymous — works but no displayName
const MyForm = controls((props, { rc, update }) => ...);
```

### Type signatures

The render function receives props as the first argument and a `ControlsContext` as the second:

```typescript
type UpdateFn = (cb: (wc: WriteContext) => void) => void;
type UseComputed = <V>(compute: (rc: ReadContext) => V) => Control<V>;

interface ControlsContext {
  rc: ReadContext;
  update: UpdateFn;
  controlContext: ControlContext;
  useComputed: UseComputed;
}

type ControlsRender<P> = (props: P, ctx: ControlsContext) => ReactNode;

function controls<P>(render: ControlsRender<P>): React.FC<P>;
function controls<P>(name: string, render: ControlsRender<P>): React.FC<P>;
```

Parents pass only their own props; `ControlsContext` is injected by the wrapper:

```typescript
const MyField = controls<{ label: string }>(function MyField({ label }, { rc, update }) {
  return <label>{label}: ...</label>;
});

// usage
<MyField label="Name" />
```

### WriteContext scoping and batching

The `WriteContext` is scoped to a single control tree root and is transient — it only exists for the duration of an `update()` callback. This ensures:

1. **No subscribers during render** — `update()` is only called from event handlers, never during render
2. **Automatic batching** — all mutations within one `update()` call are batched; subscribers run once after the callback completes
3. **No stale references** — you can't hold onto a `WriteContext` across an `await` boundary and accidentally flush at a bad time

```typescript
// Multiple writes, one subscriber notification
onClick={() => update(wc => {
  wc.setValue(firstNameControl, "");
  wc.setValue(lastNameControl, "");
  wc.setTouched(formControl, false);
})}
```

## React-Agnostic Core (`@astroapps/controls`): Primitives for Framework Layers

The core library exposes all the primitives needed by framework adapters, with no React import. `ControlContext` is the central object — it provides `newControl()`, `update()`, read context creation, and tree-level configuration. All pure TypeScript with no framework dependency:

- **Subscribe/unsubscribe on Control** — the existing bitmask-based subscription mechanism is retained directly on the `Control` interface. This is the low-level primitive that everything else builds on. `ReadContext` implementations use `control.subscribe()` / `control.unsubscribe()` internally to manage their dependency tracking — they are a higher-level abstraction over the subscription API, not a replacement for it.
- **ControlContext** — the central object. Holds tree-level configuration (equality) and provides `newControl()` and `update()`. Framework adapters receive a `ControlContext` and use it to create controls and manage read/write lifecycles. The exact API for creating tracking read contexts is TBD.
- **ReadContext as subscription manager** — a tracking `ReadContext` records `(control, property)` pairs during execution, then after the function returns, diffs against the previous dependency set and calls `subscribe`/`unsubscribe` to reconcile.
- **ReadContext lifecycle** — the framework layer manages the lifecycle: create/reset a tracking `ReadContext` before a render or effect, execute the function, finalize the dependency set after it returns, and dispose (unsubscribe all) when the component unmounts or effect is torn down. `@astroapps/controls-react`'s `controls()` wrapper orchestrates this per-render.
- **WriteContext / `update()`** — `ControlContext.update()` creates a transient `WriteContext`, executes a batch of mutations, and flushes subscriber notifications. Framework-agnostic; React just calls it from event handlers.
- **Effect primitive** — a `ReadContext` implementation that re-executes its function when a subscribed dependency changes. Pure core-level, no React dependency. React `useEffect`-style cleanup is layered on top.

The `@astroapps/controls-react` package is a thin adapter — just the `controls()` wrapper — that creates tracking `ReadContext` instances tied to React's render lifecycle and provides `ControlsContext` (with `rc`, `update`, and `controlContext`) to components. Raw `subscribe`/`unsubscribe` remains available for non-`ReadContext` use cases (bridging to external systems, tests, etc.).

## Implementation Architecture

Architecture decisions from the prototyping phase, to guide the clean-room implementation.

### 1. No ControlLogic class hierarchy — fields and elements coexist

The old `@astroapps/controls` design uses `ControlLogic` / `ObjectLogic` / `ArrayLogic` strategy classes attached to each `ControlImpl`. This adds indirection and makes it hard to follow control flow. It also means that once a control promotes to ObjectLogic, accessing elements throws (and vice versa) — so a control whose value changes between object and array types at runtime will crash.

**Clean design:** `ControlImpl` holds `_fields` and `_elems` directly. Both can coexist on the same control — there's no exclusive object-or-array state. Field/element creation is handled by inline methods on `ControlImpl` itself.

**Shape change semantics:** When a control's value changes type (e.g. object → array or vice versa), existing child controls of the "wrong" shape become stale — their values won't be synced from the parent since downward propagation only syncs fields for object values and elements for array values. The exact semantics of what happens to stale children (detach? leave as-is? cleanup?) is an open question — see Open Questions below.

### 2. No globals — NotifyFn callback pattern

The old design has `ControlImpl` calling `runTransaction(this, ...)` which manages global transaction counters and listener queues. The new design inverts this: **ControlImpl is transaction-agnostic**. Mutation methods take a `NotifyFn` callback, and the caller manages batching.

```typescript
type NotifyFn = (control: ControlImpl) => void;
```

`NotifyFn` takes only the control — no change flags. It simply means "this control's state may have changed, add it to the flush set".

**How it works:**
- Mutation methods on `ControlImpl` (e.g. `setValueImpl`, `setTouched`, `childValueChange`, `validityChanged`) accept a `notify: NotifyFn` parameter
- When a mutation causes a change, the impl calls `notify(this)` instead of managing transactions itself
- The `notify` callback is passed through the entire propagation chain (parent ↔ child), alongside the existing `from?: ControlImpl` parameter
- `initControl` passes a no-op `notify` (no subscribers exist yet)
- `validate()` creates its own ephemeral pending set and drains it
- Only remaining module-level `let`: `uniqueIdCounter` (stateless monotonic counter)

**Change detection is ControlImpl's own concern**, not the caller's. Two categories:

1. **Flag-based changes** (dirty, valid, touched, disabled): detected at flush time by `runListeners()`, which calls `getChangeState()` to recompute the current boolean state and XORs against the stored `changeState` from subscription time. Only bits that actually flipped trigger listeners. This handles cases like dirty→clean→dirty within a batch (net no change, no notification).

2. **Event-style changes** (Value, InitialValue, Error, Structure): cannot be derived from current state alone (the subscription list doesn't have the previous value). Mutations call `_subscriptions.applyChange(change)` directly to record that an event occurred. At flush time, `runListeners()` picks these up via the same XOR mechanism.

This separation means `NotifyFn` doesn't need change flags — the control's subscription bookkeeping (`applyChange`) handles what changed, and `NotifyFn` just ensures the control gets flushed.

### Listener WriteContext access

Listeners need write access during flush — the key use case is validators, which fire during flush and need to set errors on the control. Since listeners always run during `WriteContext.flush()`, the `WriteContext` is always available:

```typescript
type ChangeListenerFunc<V> = (
  control: Control<V>,
  change: ControlChange,
  wc: WriteContext,
) => void;
```

Listeners that don't need write access (e.g. `forceRender` in React's `controls()` wrapper) ignore the parameter. Validators use it:

```typescript
// validator listener
(control, change, wc) => {
  const error = validateFn(control.valueNow);
  wc.setError(control, "validate", error);
}
```

Writes from within a listener route through the same `NotifyFn`, adding more controls to the pending set. This naturally handles cascading changes (e.g. a validator setting an error triggers validity propagation up the tree).

### afterChanges callbacks

`WriteContext` supports registering callbacks that run after all listeners have been drained:

```typescript
interface WriteContext {
  // ... existing mutation methods ...
  afterChanges(cb: () => void): void;
}
```

This is for work that needs the tree fully settled — all mutations applied, all listeners run, all validators re-run.

### WriteContext batching and drain loop

```typescript
class WriteContextImpl {
  private pending = new Set<ControlImpl>();
  private afterChangesCbs: (() => void)[] = [];

  private notify: NotifyFn = (control) => {
    this.pending.add(control);
  };

  setValue(control, value) {
    toImpl(control).setValueImpl(value, this.notify);
  }

  afterChanges(cb: () => void) {
    this.afterChangesCbs.push(cb);
  }

  flush() {
    // Drain loop — listeners may queue more controls via writes
    while (this.pending.size > 0) {
      const batch = [...this.pending];
      this.pending.clear();
      for (const control of batch) {
        control.runListeners(this);  // pass WriteContext to listeners
      }
    }
    // After all listeners have settled
    for (const cb of this.afterChangesCbs) {
      cb();
    }
  }
}
```

### 3. Control is read-only interface, mutations on ControlImpl

`Control<V>` exposes only read and subscription operations:
- `uniqueId`, `current` (snapshot), `fields`, `elements`, `subscribe`, `unsubscribe`, `cleanup`, `meta`, `as`
- `validate` lives on `WriteContext` (not `Control`) — it needs a write batch to set errors. `@react-typed-forms/core` monkey-patches a convenience `control.validate()` for legacy compat
- No `value` setter, no `set*` methods on Control

Mutation methods live on `ControlImpl` (not on the `Control` interface). They take a `NotifyFn` parameter so the caller controls when listeners run:
- `setValueImpl(v, notify, from?)` — also calls `_subscriptions.applyChange(Value)`
- `setInitialValueImpl(v, notify, from?)` — also calls `_subscriptions.applyChange(InitialValue)`
- `setTouched(touched, notify, notChildren?)`
- `setDisabled(disabled, notify, notChildren?)`
- `setError(key, error, notify)` — also calls `_subscriptions.applyChange(Error)`
- `setErrors(errors, notify)` — also calls `_subscriptions.applyChange(Error)`
- `clearErrors(notify)`
- `markAsClean(notify)`

`WriteContext` wraps these for the user-facing API, providing its own `NotifyFn` that collects controls into a pending set for batched flush.

### 4. No `collectChange` global

The old design uses a module-level `collectChange` callback for implicit reactivity (property getters call it). This is the primary source of global state.

**New design:** `ReadContext` explicitly tracks subscriptions. No global `collectChange` needed. Property access on `Control` returns snapshot values without triggering any side effects.

## Migration Strategy: Three-Package Architecture

### Package roles

| Package | Role | Globals | React |
|---------|------|---------|-------|
| `@astroapps/controls` | Clean core | None | No |
| `@astroapps/controls-react` | Clean React adapter (`controls()` wrapper) | None | Yes |
| `@react-typed-forms/core` | Legacy compat (monkey-patch + hooks) | Yes | Yes |

### What the monkey patch adds (`@react-typed-forms/core`)

`@react-typed-forms/core` augments `Control.prototype` (or equivalent) with:

- **`.value` getter/setter** — the getter calls into the global `collectChange` / change collector to register implicit reactive reads (same mechanism as today). The setter calls through to the underlying mutation + global transaction batching.
- **`.initialValue`, `.dirty`, `.touched`, `.disabled`, `.valid`, `.error`, `.errors`, `.isNull`** — reactive property accessors that participate in implicit dependency tracking via the global collector.
- **`.current`** — returns a `ControlProperties<V>` snapshot (non-reactive reads, same as the `*Now` properties).
- **Direct mutation methods on Control** — `.setValue()`, `.setError()`, `.setErrors()`, `.setTouched()`, `.setDisabled()`, `.markAsClean()`, `.clearErrors()`, `.setValueAndInitial()`, `.setInitialValue()` — these delegate to the global transaction/batching mechanism.
- **Global transaction machinery** — `runTransaction`, `groupedChanges`, `runPendingChanges`, `setChangeCollector`, `unsafeFreezeCountEdit` — module-level state that the implicit API requires.
- **All existing hooks** — `useControl`, `useComputed`, `useControlEffect`, `useValidator`, `useAsyncValidator`, `useValueChangeEffect`, `useSelectableArray`, `useControlGroup`, `usePreviousValue`, `controlValues`, `useComponentTracking`, `useTrackedComponent`.
- **Form components** — `Finput`, `Fcheckbox`, `Fselect`, `RenderControl`, `RenderOptional`, `RenderElements`, `RenderArrayElements`.

Hooks and form components stay in `@react-typed-forms/core` for now — the `controls()` pattern may enable a better API than hooks in future.

### What stays in `@astroapps/controls` (clean core)

- `Control<V>` with only `*Now` snapshot reads, `fields`, `elements`, `subscribe`/`unsubscribe`, `meta`, `uniqueId`
- `ReadContext` / `WriteContext` interfaces
- `newControl()` factory
- Subscription bitmask system (`ControlChange`, `Subscription`, `ChangeListenerFunc`)
- All tree semantics (value propagation, lazy children, validity, etc.)
- No globals, no implicit reactivity

### What lives in `@astroapps/controls-react` (clean React adapter)

- `controls()` wrapper — provides `ControlsContext` (`rc`, `update`, `controlContext`) as second arg to render function
- `UpdateFn`, `ControlsContext`, and `ControlsRender<P>` types

That's it for now. This package is intentionally minimal — just the React render lifecycle bridge.

### Why this split

- **Clean core stays clean** — `@astroapps/controls` has no global state, is testable without jsdom, portable to C#, and usable in non-React contexts (Node, server, other frameworks).
- **Legacy compat lives where it's needed** — the implicit reactivity (global change collector, module-level transactions) only exists in `@react-typed-forms/core`, which is already React-specific and already manages component render tracking.
- **Clean React adapter is minimal** — `@astroapps/controls-react` is a thin bridge between the core's `ReadContext`/`WriteContext` and React's render lifecycle. No globals, no build plugins. Future hooks or components can be added here when a better-than-hooks API is designed.
- **Incremental migration** — existing code using `control.value`, `control.touched = true`, etc. keeps working via the monkey patch. New code can use the explicit `ReadContext`/`WriteContext` API via `controls()`. Components can mix both styles during migration.
- **Single implementation** — the monkey-patched methods delegate to the same `ControlImpl` internals, so there's one source of truth for behavior. The patch just adds an alternative (implicit) entry point to the same underlying operations.

### React integration coexistence

All three React patterns work on the same control tree:

- **Legacy**: `useComponentTracking()` + SWC/Babel transform + implicit `.value` reads (`@react-typed-forms/core`)
- **New**: `controls()` wrapper with explicit `rc` / `update` (`@astroapps/controls-react`)

A component using `controls()` and a component using `useComponentTracking()` can share the same `Control` instances. The subscription system is the same underneath — only the mechanism for registering dependencies differs (explicit `ReadContext` vs global change collector).

### Prototype note

The current prototype `writeContext.ts` delegates to the monkey-patch API (`control.value = value`, `groupedChanges`). The final implementation should use the `NotifyFn`-based `WriteContextImpl` described in the Implementation Architecture section, with no dependency on global transaction state.

## FormStateNode Design

FormStateNode is the runtime representation of a single node in the form definition tree. It bridges a `ControlDefinition` (what to render) with a `SchemaDataNode` (the data context). Each node manages reactive state for visibility, disabled, readonly, validation, children, and the resolved definition.

### Design Principles

1. **Reactive state is explicit** — reactive properties are exposed as raw `Control<T>` instances, not hidden behind getters
2. **ReadContext-aware accessors** — convenience methods take a `ReadContext` and return plain snapshots, subscribing the caller to exactly the right controls
3. **Two modes of interaction** — "setting up reactivity" (work with raw controls) vs "reading inside a reactive context" (use `rc`-based accessors)
4. **Proxy is ephemeral** — override/script proxies are created per `ReadContext` call, not cached. They're stateless lenses, not reactive objects

### Interface

All reactive state lives in a single `stateControl: Control<FormStateNodeState>`. This gives one cleanup scope, one structural tree, and consistent access patterns — internal wiring uses `stateControl.fields.*` directly, and `rc`-based accessors read through those same child controls.

```typescript
interface FormStateNodeState {
  visible: boolean | null;
  disabled: boolean;
  readonly: boolean;
  children: FormStateNodeState[];
  dataNode: SchemaDataNode | undefined;
  definitionOverrides: Record<string, any>;
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

### Definition Resolution Layers

When `getDefinition(rc)` is called, it returns a proxy that resolves property access through up to three layers:

1. **Script override layer** — checks `stateControl.fields.definitionOverrides` via `rc`. Script computeds cache their results in these controls (e.g. a `hidden` script writes its result into `definitionOverrides.fields.hidden`). Reading through `rc` subscribes the caller to the cached result.

2. **Editor layer** (optional) — if the base definition is backed by a `Control<ControlDefinition>` (e.g. in a form editor's preview mode), property access reads through `rc`, subscribing to editor changes.

3. **Static fallback** — plain property access on the original `ControlDefinition` object. No subscription.

The proxy is created fresh per `getDefinition(rc)` call — it holds no state and needs no cleanup. It's just a lens that routes reads through the `ReadContext`.

### Script Override Lifecycle

Script computeds are the only part of the definition resolution that has lifecycle:

```
stateControl (Control<FormStateNodeState>)
  └─ fields.definitionOverrides (Control<Record<string, any>>)
       ├─ computed: evaluate "hidden" script → write result to overrides.fields.hidden
       ├─ computed: evaluate "disabled" script → write result to overrides.fields.disabled
       └─ computed: evaluate "label" script → write result to overrides.fields.label
```

- Script computeds are created during `initFormState()`, scoped to `stateControl`
- Each script computed tracks its own dependencies (data controls referenced by the expression) and writes its cached result into the corresponding override control
- When a dependency changes, only that script re-evaluates
- On cleanup, all script computeds are torn down (unsubscribe from dependencies)

**Editor mode coarse invalidation:** When the base definition is a `Control<ControlDefinition>` (editor mode), a single tracked computation reads the entire definition. If any property changes, all script computeds are torn down and recreated. This is acceptable — editor preview doesn't need fine-grained reactivity.

### Computed Properties

These are set up as `computed()` instances during initialization, scoped to the FormStateNode:

- **dataNode** — `computed` that looks up the field path from the resolved definition in the parent `SchemaDataNode`
- **visible** — `computed` combining: parent visibility cascade, force-hidden flag, data node validity, definition's `hidden` property (via `getDefinition`)
- **disabled** — `computed` combining: parent cascade, force-disabled flag, definition property
- **readonly** — `computed` combining: parent cascade, force-readonly flag, definition property

### Sync Effects

Effects that keep the FormStateNode and its data control in sync:

- disabled → pushed to the data control
- touched ↔ bidirectional sync with the data control
- errors ← pulled from the data control
- default value logic: clear data when hidden, apply default when visible and undefined

### Children Lifecycle

Children are managed by an effect on `stateControl.fields.children`:

1. `resolveChildren()` determines the child specs (from form node children, array elements, or field options)
2. Children are cached by `childKey` for identity stability across re-evaluations
3. If the parent data context changes, the cache is cleared — entire subtree rebuilds
4. Detached children get `cleanup()` called immediately
5. Each child is a new `FormStateNode` with its own scope, computed properties, and sync effects

### Cleanup Chain

```
FormStateNode.cleanup()
  └─ stateControl.cleanup()
       ├─ All computed properties stop tracking (visible, disabled, readonly, dataNode)
       ├─ All sync effects unsubscribe (disabled sync, touched sync, error sync, defaults)
       ├─ All script computeds unsubscribe (definitionOverrides children)
       ├─ Children elements cleaned up recursively (each child's stateControl)
       └─ Validation effects torn down
```

### Cascade Rules

- **Visibility, disabled, readonly** cascade down — if parent is hidden, all descendants are hidden
- **Errors** bubble up through the data control tree (not the form state tree)
- **Data context** can switch when entering array elements or compound fields — each child resolves its data node relative to its parent's data context

## Open Questions

- How do computed/derived controls fit in — are they `ReadContext` implementations that write to a control via `WriteContext`?
- How does the React layer discover/share the control tree root's `update()` function — React context, prop drilling, or a root-level provider?
- **Shape change semantics**: When a control's value changes from object → array (or vice versa), what happens to existing child controls of the old shape? Options: (a) detach them (clear parent link, leave them orphaned), (b) leave them as-is with stale values (they re-sync if the shape changes back), (c) cleanup/dispose them. The practical question is whether anyone holds references to them.

### Resolved

- **Where does `newControl` live?** — On `ControlContext` in core, which holds tree-level configuration (equality, etc.). `@react-typed-forms/core` provides standalone `newControl()` and `update()` functions that use a default `ControlContext` with `deepEquals`.
- **Should the tracking `ReadContext` be reusable?** — Yes, reusable. Reset between renders. More allocation-friendly and the `controls()` wrapper manages the lifecycle cleanly. The exact creation API is TBD.
- **How does `update()` find the tree root for batching?** — It doesn't need to. `ControlContext.update()` creates a fresh `WriteContext` per call. No tree-root discovery needed.
