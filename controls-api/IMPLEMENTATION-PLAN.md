# Implementation Plan: Clean-room @astroapps/controls and @astroapps/controls-react

## Context

The `controls-api` project has type specs (`types.ts`, `react-types.ts`) and design docs defining a new controls library with explicit reactivity and no globals. This plan describes how to implement these interfaces so the example `page.tsx` actually works.

## Files to create (in order)

### 1. `src/lib/deepEquals.ts`
- `deepEquals(a: unknown, b: unknown): boolean`
- Simplified from existing: no `childEquals` param (equality is tree-level)
- Handles: `===` fast path, `null`/`undefined`, constructor check, arrays, plain objects, NaN

### 2. `src/lib/subscriptions.ts`
- `SubscriptionList` — groups subscriptions with same mask, manages changeState XOR
- `Subscriptions` — collection of lists, delegates subscribe/unsubscribe/runListeners
- Key change from old: `runListeners` takes `WriteContext` param, passes to listener callbacks
- Same XOR-based change detection: flag-based (Dirty/Valid/Touched/Disabled) recomputed at flush, event-style (Value/InitialValue/Error/Structure) recorded via `applyChange()`

### 3. `src/lib/controlImpl.ts` — **the core**
`ControlImpl` class implementing `Control<V>`. Single flat class (no ControlLogic hierarchy).

**Internal state**: `_value`, `_initialValue`, `_flags` (bitmask), `_errors`, `_fields` (lazy Record), `_elems` (lazy array), `_parents` (ParentLink[]), `_subscriptions` (lazy), `uniqueId`, `meta`, `_controlContext`

**Key internal types**:
- `NotifyFn = (control: ControlImpl) => void`
- `ControlFlags` enum: Touched, Disabled, ChildInvalid, DontClearError
- `ParentLink = { control, key, origKey? }`

**Mutation methods** (all take `notify: NotifyFn`):
- `setValueImpl(v, notify, from?)` — equality check, store, auto-clear errors, sync fields/elements down, propagate up, applyChange, notify
- `setInitialValueImpl(v, notify, from?)` — downward only, sync fields/elements
- `childValueChange(parentLink, notify)` — shallow-copy parent, set key, call parent.setValueImpl
- `setTouchedImpl`, `setDisabledImpl` — flag + cascade to children
- `setErrorImpl`, `setErrorsImpl`, `clearErrorsImpl` — keyed errors, validity propagation up
- `validityChangedImpl(hasErrors, notify)` — walk parents, set/clear ChildInvalid

**Lazy creation**:
- `get fields` → Proxy calling `getField(key)` which creates, caches, links parent, returns child
- `get elements` → `getOrCreateElements()` creates from `_value` array
- `syncElementsOnValueChange(notify)` — if `!Array.isArray(newValue)`, trim all elements to 0 (detach + clear `_elems`); otherwise reuse/create/trim existing elements
- `syncElementsOnInitialValueChange(notify)` — if `!Array.isArray(newInitialValue)`, trim all elements; otherwise update initialValue, re-key origKey

**Other**: `getChangeState(mask)`, `runListeners(wc)`, `subscribe/unsubscribe`, `validate(notify, wc)` (internal, used by WriteContextImpl)

### 4. `src/lib/writeContextImpl.ts`
- `WriteContextImpl` with `pending: Set<ControlImpl>`, `afterChangesCbs`, `notify: NotifyFn`
- All WriteContext methods delegate to `toImpl(control).xxxImpl(..., this.notify)`
- `validate(control)` — delegates to `toImpl(control).validate(this.notify, this)`, returns `isValid()`
- `flush()`: drain loop (pending → runListeners → repeat), then afterChanges callbacks
- `updateElements` logic ported from existing `arrayControl.ts`

### 5. `src/lib/readContextImpl.ts`
- `NoopReadContext` — returns `*Now` values directly, no tracking
- `TrackingReadContext` — records `Map<ControlImpl, ControlChange>` during reads, exposes `reset()`, `getTracked()`
- `SubscriptionReconciler` — reconciles tracked set against active subscriptions (subscribe new, unsubscribe removed, update changed masks)

### 6. `src/lib/controlContextImpl.ts`
- `createControlContext(options?)` → `ControlContextImpl`
- `newControl(value, setup?)` — builds ChildFactory from setup, creates ControlImpl, runs init (validator, eager fields, eager elems, meta, afterCreate)
- `update(cb)` — creates WriteContextImpl, calls cb, flushes
- `buildChildFactory(setup, equals)` — recursive factory that creates children with correct sub-setup
- `initControl(control, setup)` — validator subscription, eager creation, meta, afterCreate
- `markTrackerDead(reconciler)` — sets `alive = false` on the reconciler, adds it to the dead tracker set
- `reviveTracker(reconciler)` — sets `alive = true`, removes from dead set (React strict mode: unmount/remount before sweep runs)
- **Lazy cleanup sweep**: a single `setTimeout` (scheduled on first dead tracker, reset on each new death) walks the dead set and unsubscribes any trackers still marked dead

### 7. `src/lib/controlsImpl.tsx`
- `ControlContextReact` — React.createContext for ControlContext
- `ControlContextProvider` — provider component
- `controls()` implementation:
  1. Get ControlContext from React context
  2. useRef for TrackingReadContext + SubscriptionReconciler (reconciler has `alive` flag, starts `true`)
  3. Reset tracker, call render with `(props, { rc, update, controlContext })`
  4. After return, **always reconcile subscriptions** (during render, not in effect)
  5. Subscription listener checks `alive` flag — if `false`, listener is a no-op (no `setState`, no re-render)
  6. `useEffect` calls `controlContext.reviveTracker(reconciler)` on mount; cleanup calls `controlContext.markTrackerDead(reconciler)`
  7. Not wrapped in React.memo — Controls are stable mutable references, so shallow prop comparison can't determine re-render need

### 8. Update `src/app/page.tsx`
- Import from implementation files instead of type specs
- Add `ControlContextProvider` at root
- Create `createControlContext()` at module level

## Key design decisions

- **No globals**: All state on ControlImpl instances and transient WriteContext
- **NotifyFn pattern**: Mutations don't manage transactions — they call `notify(this)`, caller controls batching
- **Single class**: No ControlLogic/ObjectLogic/ArrayLogic hierarchy — fields and elements coexist
- **Tree-level equality**: Equality function accessed via `_controlContext` rather than stored separately on each control
- **Validator init**: Run immediately with `noopNotify`, then subscribe for `Value | Validate`
- **`noopNotify`**: Used during init when no subscribers exist
- **Alive/dead listeners**: Subscription listeners check an `alive` flag before triggering re-renders — dead listeners are immediate no-ops. `ControlContext` owns a lazy sweep timeout that unsubscribes any trackers still dead when it fires. React strict mode safe: unmount sets `alive = false`, remount sets it back to `true` before the sweep runs
- **No React.memo**: Components re-render via subscriptions, not prop identity changes. Controls are stable mutable references whose identity doesn't reflect value changes

## Verification

- `npx tsc --noEmit` — type-check passes
- `npm run dev` — page loads, form works (create controls, read values, write values, dirty/valid tracking)
- Manual test: type in fields, verify dirty/clean status, click Validate, verify errors appear, click Reset