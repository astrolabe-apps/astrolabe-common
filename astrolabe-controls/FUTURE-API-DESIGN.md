# Future API Design: Explicit Reactivity & Write Context

This document captures a proposed future direction for `@astroapps/controls` that removes global variables and makes reactivity and writes explicit.

## Goals

- **No global variables** — no module-level state, no ambient dependency tracking
- **Explicit reactivity** — reading a control property only subscribes if you do it through a `ReadContext`
- **Explicit writes** — all mutations go through a `WriteContext` which controls when subscribers are notified
- **C# portability** — the design maps cleanly to C# interfaces without proxy/getter magic

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

`runSubscribers()` is not part of the interface — only the instantiator holds the concrete object and decides when to notify subscribers.

## Contrast with Current API

| Concern | Current | Proposed |
|---------|---------|----------|
| Reactive read | `control.value` (implicit, magic) | `rc.getValue(control)` (explicit) |
| Snapshot read | `control.value` (ambiguous) | `control.valueNow` (unambiguous) |
| Mutation | `control.setValue(x)` (on Control) | `wc.setValue(control, x)` (explicit) |
| Subscriber notification | Module-level globals | `runSubscribers()` on the concrete impl, not the interface |
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

## Open Questions

- Who creates and vends `ReadContext` instances? (React context? Standalone factory?)
- How do computed/derived controls fit in — are they `ReadContext` implementations that write to a control via `WriteContext`?
- How does the React integration layer change (likely `useReadContext()` hook backed by `useSyncExternalStore`)?
- Where does `newControl` live? (standalone factory function)
