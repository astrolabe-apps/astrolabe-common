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
  addElement<V>(control: Control<V[]>, child: V, index?: number): Control<V>
  removeElement<V>(control: Control<V[]>, child: number | Control<V>): void
  updateElements<V>(control: Control<V[]>, cb: (elems: Control<V>[]) => Control<V>[]): Control<V>[]
}
```

`WriteContext` is transient — it only exists for the duration of a callback passed to `update()`. This ensures mutations are always batched and subscribers only run after all writes in a batch are complete.

## Contrast with Current API

| Concern | Current | Proposed |
|---------|---------|----------|
| Reactive read | `control.value` (implicit, magic) | `rc.getValue(control)` (explicit) |
| Snapshot read | `control.value` (ambiguous) | `control.valueNow` (unambiguous) |
| Mutation | `control.setValue(x)` (on Control) | `update(wc => wc.setValue(control, x))` (explicit, batched) |
| Subscriber notification | Module-level globals | `update()` flushes subscribers after callback completes |
| Dependency tracking | Global `collectChange` callback | `ReadContext` object, no globals |

## C# Alignment

All three interfaces map directly to plain C# interfaces — no proxy or getter magic needed:

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
}
```

## React Integration: `controls()` wrapper

### Decision

Rather than a `useControls()` hook (which can't know when render finishes to finalize dependency tracking) or a Babel plugin (like `@react-typed-forms/transform`), components are wrapped with a `controls()` function that injects `rc` (ReadContext) and `update` (a callback to run writes) as arguments:

```typescript
const MyForm = controls(function MyForm({ rc, update, name }) {
  const value = rc.getValue(name);
  return (
    <input
      value={value}
      onChange={(e) => update(wc => wc.setValue(name, e.target.value))}
    />
  );
});
```

### Why `controls()` and not a hook

The problem with `const { rc, update } = useControls()` is that the `ReadContext` needs to know when the render function finishes executing so it can finalize the dependency set and subscribe. A hook runs at the top of the component but has no way to know when the return statement is reached. The Babel plugin (`@react-typed-forms/transform`) solved this by injecting try/finally around the component body, but we want to avoid build tooling dependencies.

`controls()` solves this naturally — it calls the wrapped function directly, so it knows exactly when it returns. At that point it has the complete set of `(control, property)` pairs that were read, and can diff against the previous set and update subscriptions.

### How it works

1. `controls()` returns a `React.memo` component
2. On each render, it creates/resets a tracking `ReadContext`, calls the inner function
3. When the function returns, the dep set is complete
4. Deps are compared to the previous set; subscriptions are updated
5. When a tracked dependency changes, the component re-renders

### Component naming

`controls()` supports both named functions and an explicit string name to ensure components aren't anonymous in React DevTools:

```typescript
// Named function — displayName inferred from fn.name
const MyForm = controls(function MyForm({ rc, update }) { ... });

// Explicit string name
const MyForm = controls("MyForm", ({ rc, update }) => ...);

// Anonymous — works but no displayName
const MyForm = controls(({ rc, update }) => ...);
```

### Passing props

Custom props are typed via a generic and merged with the injected `rc`/`update`:

```typescript
type UpdateFn = (cb: (wc: WriteContext) => void) => void;
type ControlsRender<P> = (props: P & { rc: ReadContext; update: UpdateFn }) => ReactNode;

function controls<P>(render: ControlsRender<P>): React.FC<P>;
function controls<P>(name: string, render: ControlsRender<P>): React.FC<P>;
```

Parents pass only their own props; `rc` and `update` are injected by the wrapper:

```typescript
const MyField = controls<{ label: string }>(function MyField({ rc, update, label }) {
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

## React-Agnostic Core: Primitives for the React Layer

The core library must expose enough primitives that a React (or other framework) layer can build its integration without reaching into internals. Key primitives to define:

- **Subscribe/unsubscribe on Control** — the existing bitmask-based subscription mechanism from `@astroapps/controls` is retained directly on the `Control` interface. This is the low-level primitive that everything else builds on. `ReadContext` implementations use `control.subscribe()` / `control.unsubscribe()` internally to manage their dependency tracking — they are a higher-level abstraction over the subscription API, not a replacement for it.
- **ReadContext as subscription manager** — a tracking `ReadContext` records `(control, property)` pairs during execution, then after the function returns, diffs against the previous dependency set and calls `subscribe`/`unsubscribe` to reconcile. A no-op `ReadContext` just returns snapshot values without subscribing.
- **ReadContext lifecycle** — the framework layer manages the lifecycle: create/reset a tracking `ReadContext` before a render or effect, execute the function, finalize the dependency set after it returns, and dispose (unsubscribe all) when the component unmounts or effect is torn down. The React `controls()` wrapper orchestrates this per-render.
- **WriteContext / `update()` factory** — a way to create a transient `WriteContext`, execute a batch of mutations, and flush subscriber notifications. Batching uses the same transaction-count + queue + drain pattern as the current library, but scoped to the control tree root rather than module-level globals. This is framework-agnostic; React just calls it from event handlers.
- **Control tree creation** — `newControl()` or equivalent factory that creates the control tree. No React dependency needed.
- **Effect primitive** — a `ReadContext` implementation that re-executes its function when a subscribed dependency changes. Pure core-level, no React dependency. React `useEffect`-style cleanup is layered on top.

This separation means the core package is a pure TypeScript library with no `react` import. The React layer is a thin adapter (~`controls()` wrapper + a hook or two) that creates `ReadContext` instances tied to React's render lifecycle and calls `update()` from event handlers. Raw `subscribe`/`unsubscribe` remains available for non-`ReadContext` use cases (bridging to external systems, tests, etc.).

## Implementation Architecture

Architecture decisions from the prototyping phase, to guide the clean-room implementation.

### 1. No ControlLogic class hierarchy

The old `@astroapps/controls` design uses `ControlLogic` / `ObjectLogic` / `ArrayLogic` strategy classes attached to each `ControlImpl`. This adds indirection and makes it hard to follow control flow.

**Clean design:** `ControlImpl` holds `_fields` and `_elems` directly. Field/element creation is handled by inline methods on `ControlImpl` itself. Mutation logic lives in free functions (`applyValue`, `applyTouched`, etc.) that operate on the impl directly.

### 2. No globals — TransactionState threaded through callbacks

Transaction batching state (`transactionCount`, `runListenerList`, `afterChangesCallbacks`) lives in a `TransactionState` instance rather than module-level variables.

- Created per `update()` call (transient, never stored)
- Threaded through: `update()` → `WriteContextImpl(tx)` → `apply*(tx, impl, ...)` → `tx.runTransaction(...)` → listeners receive `tx` as optional 3rd param → validators can call `apply*(tx, ...)`
- `ChangeListenerFunc` gains optional `tx?: TransactionScope` parameter
- `initControl` bypasses transactions (sets errors directly, no subscribers exist yet)
- `validate()` creates its own temporary `TransactionState`
- Only remaining module-level `let`: `uniqueIdCounter` (stateless monotonic counter)

### 3. Control is read-only interface, mutations via free functions

`Control<V>` exposes only read and subscription operations:
- `uniqueId`, `current` (snapshot), `fields`, `elements`, `subscribe`, `unsubscribe`, `validate`, `cleanup`, `meta`, `as`, `lookupControl`
- No `value` setter, no `set*` methods on Control

Write API is free functions: `applyValue(tx, impl, v)`, `applyTouched(tx, impl, touched)`, etc. `WriteContext` wraps these for the user-facing API.

### 4. No `collectChange` global

The old design uses a module-level `collectChange` callback for implicit reactivity (property getters call it). This is the primary source of global state.

**New design:** `ReadContext` explicitly tracks subscriptions. No global `collectChange` needed. Property access on `Control` returns snapshot values without triggering any side effects.

## Open Questions

- How do computed/derived controls fit in — are they `ReadContext` implementations that write to a control via `WriteContext`?
- How does the React layer discover/share the control tree root's `update()` function — React context, prop drilling, or a root-level provider?

### Resolved

- **Where does `newControl` live?** — Standalone factory function, not a method on any class.
- **Should the tracking `ReadContext` be reusable?** — Yes, reusable. Reset between renders via `SubscriptionTracker`. More allocation-friendly and the `controls()` wrapper manages the lifecycle cleanly.
- **How does `update()` find the tree root for batching?** — It doesn't need to. `update()` creates a fresh `TransactionState` per call. No tree-root discovery needed.
