# Future API Design: Explicit Reactivity & Write Context

This document captures a proposed future direction for `@astroapps/controls` that removes global variables and makes reactivity and writes explicit.

## Goals

- **No global variables** — no module-level state, no ambient dependency tracking
- **Explicit reactivity** — reading a control property only subscribes if you do it through a readContext
- **Explicit writes** — all mutations go through a `WriteContext` which controls when subscribers are notified
- **C# portability** — the design maps cleanly to C# interfaces without proxy/getter magic

## Core Concepts

### Control (read-only data container)

The `Control<V>` object becomes a dumb data container. Plain property reads are always safe, non-reactive snapshots — the `Now` postfix makes this unambiguous:

```typescript
control.valueNow     // current value, no subscription
control.validNow     // current valid state, no subscription
control.touchedNow
control.dirtyNow
control.disabledNow
control.errorNow
```

### ReadContext (reactive read context)

A `ReadContext` is an explicit reactive context. Reading through a readContext registers a dependency:

```typescript
interface ReadContext {
  getValue<V>(control: Control<V>): V
  isValid(control: Control<unknown>): boolean
  isTouched(control: Control<unknown>): boolean
  isDirty(control: Control<unknown>): boolean
  isDisabled(control: Control<unknown>): boolean
  getError(control: Control<unknown>): string | null | undefined
  getElements<V>(control: Control<V[]>): Control<V>[]
  // ...
}
```

The creator of the readContext decides when to re-run and when to update subscriptions. Different readContext implementations have different strategies:

- **React render readContext** — records `(control, property)` pairs during render, subscribes, re-renders on change
- **Effect readContext** — re-runs a compute function when any dependency changes
- **Noop readContext** — returns current values with no subscriptions (tests, one-shot reads)
- **Snapshot readContext** — freezes values at a point in time

### WriteContext (explicit write context)

A `WriteContext` is the counterpart to `ReadContext`. All mutations go through it rather than on `Control` directly. It accumulates changes and exposes `runSubscribers()` to notify them when ready:

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

`runSubscribers()` is not part of the interface — only the instantiator holds the concrete object and decides when to notify. This is analogous to how `Promise` keeps `resolve`/`reject` separate from the promise itself.

## Subscription Storage

## Contrast with Current API

| Concern | Current | Proposed |
|---------|---------|----------|
| Reactive read | `control.value` (implicit, magic) | `readContext.getValue(control)` (explicit) |
| Snapshot read | `control.value` (ambiguous) | `control.valueNow` (unambiguous) |
| Mutation | `control.setValue(x)` (on Control) | `wc.setValue(control, x)` (explicit write context) |
| Subscriber notification | Module-level globals | `runSubscribers()` on the concrete impl, not the interface |
| Dependency tracking | Global `collectChange` callback | `ReadContext` object, no globals |

## C# Alignment

The readContext interface maps directly to a plain C# interface — no proxy or getter magic needed:

```csharp
interface IReadContext {
    T GetValue<T>(IControl<T> control);
    bool IsValid(IControl control);
    bool IsTouched(IControl control);
    bool IsDirty(IControl control);
    bool IsDisabled(IControl control);
    string? GetError(IControl control);
    // ...
}
```

The `WriteContext` maps directly to the existing `ControlEditor` pattern:

```csharp
interface IWriteContext {
    void SetValue<T>(IControl<T> control, T value);
    void SetTouched(IControl control, bool touched);
    void SetDisabled(IControl control, bool disabled);
    void SetError(IControl control, string key, string? error);
    // ...
}
```

## Open Questions

- Who creates and vends readContexts? (React context? Standalone factory?)
- How do computed/derived controls fit in — are they readContexts that write to a control?
- How does the React integration layer change (likely `useReadContext()` hook backed by `useSyncExternalStore`)?
- Where does `newControl` live? (standalone factory function)