# Future API Design: Explicit Reactivity & Transactions

This document captures a proposed future direction for `@astroapps/controls` that removes global variables and makes reactivity and transactions explicit.

## Goals

- **No global variables** — no module-level transaction state, no ambient dependency tracking
- **Explicit reactivity** — reading a control property only subscribes if you do it through a tracker
- **Explicit transactions** — mutations are batched via a scheduler; subscribers only notified at end
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

### Tracker (reactive read context)

A `Tracker` is an explicit reactive context. Reading through a tracker registers a dependency:

```typescript
interface Tracker {
  value<V>(control: Control<V>): V
  valid(control: Control<unknown>): boolean
  touched(control: Control<unknown>): boolean
  dirty(control: Control<unknown>): boolean
  disabled(control: Control<unknown>): boolean
  error(control: Control<unknown>): string | null | undefined
  hidden(control: Control<unknown>): boolean
  elements<V>(control: Control<V[]>): Control<V[number]>[]
  // ...
}
```

The creator of the tracker decides when to re-run and when to update subscriptions. Different tracker implementations have different strategies:

- **React render tracker** — records `(control, property)` pairs during render, subscribes, re-renders on change
- **Effect tracker** — re-runs a compute function when any dependency changes
- **Noop tracker** — returns current values with no subscriptions (tests, one-shot reads)
- **Snapshot tracker** — freezes values at a point in time

### Scheduler (transaction context)

The `Scheduler` owns transaction state, replacing the current module-level globals (`transactionCount`, `runListenerList`, `afterChangesCallbacks`):

```typescript
interface Scheduler {
  batch<T>(fn: () => T): T           // subscribers only notified at end
  afterChanges(cb: () => void): void
  newControl<V>(value: V, setup?: ControlSetup<V>): Control<V>
}
```

For React, a single scheduler is created at app root and provided via context. Tests create their own isolated scheduler.

## Subscription Storage

Subscriptions are stored as a bidirectional map between controls and trackers:

```
Control  ->  Map<Tracker, ControlChange>   // which trackers watch this, combined mask
Tracker  ->  Map<Control, ControlChange>   // which controls this watches, combined mask
```

Each tracker contributes at most one entry per control (with a combined bitmask across all properties it accessed on that control). When a tracker re-runs it diffs old vs new dependency maps and updates only what changed.

## Contrast with Current API

| Concern | Current | Proposed |
|---------|---------|----------|
| Reactive read | `control.value` (implicit, magic) | `tracker.value(control)` (explicit) |
| Snapshot read | `control.value` (ambiguous) | `control.valueNow` (unambiguous) |
| Transaction state | Module-level globals | Owned by `Scheduler` instance |
| Dependency tracking | Global `collectChange` callback | `Tracker` object, no globals |

## C# Alignment

The tracker interface maps directly to a plain C# interface — no proxy or getter magic needed:

```csharp
interface ITracker {
    T Value<T>(IControl<T> control);
    bool Valid(IControl control);
    bool Touched(IControl control);
    bool Hidden(IControl control);
    // ...
}
```

The scheduler maps to the existing `ControlEditor` pattern (explicit write context), so the C# port gains an explicit read context (`ITracker`) to complement it.

## Open Questions

- Who creates and vends trackers? (React context? Scheduler? Standalone?)
- How do computed/derived controls fit in — are they trackers that write to a control?
- How does the React integration layer change (likely `useTracker()` hook backed by `useSyncExternalStore`)?