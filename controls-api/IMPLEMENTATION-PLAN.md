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

### 4b. `src/lib/controlUtils.ts` — standalone utility functions
- All three are standalone exported functions (not on `Control` interface) to keep the interface minimal
- `lookupControl(control, path)` — walks `fields`/`elements` by `(string | number)[]` path segments. Uses public `Control` API only (no internals needed). Returns `undefined` if any segment fails to resolve
- `getControlPath(control, untilParent?)` — walks `_parents[0].key` upward, collects keys, reverses to root-to-leaf order. Needs `toImpl()` to access `_parents`
- `getElementIndex(child, parent?)` — reads `ParentLink.key` (current index) and `ParentLink.origKey` (initial index). Needs `toImpl()` to access `_parents`. Returns `undefined` for detached elements

### 5. `src/lib/readContextImpl.ts`
- `NoopReadContext` — returns `*Now` values directly, no tracking
- `TrackingReadContext` — records `Map<ControlImpl, ControlChange>` during reads, exposes `reset()`, `getTracked()`
- `SubscriptionReconciler` — reconciles tracked set against active subscriptions (subscribe new, unsubscribe removed, update changed masks)

### 5b. `src/lib/computed.ts` — reactive computation primitives
Built entirely on `TrackingReadContext` + `SubscriptionReconciler`. No new subscription mechanisms.

- `computed(ctx, target, compute)` → `SubscriptionReconciler`
  - Creates `TrackingReadContext` + `SubscriptionReconciler` internally
  - Initial run: reset tracker, execute `compute(rc)`, reconcile, write result to target via `ctx.update()`
  - On dep change: reconciler listener fires → re-runs compute, reconciles, writes new value
  - Returns reconciler for caller to manage lifecycle

- `effect(ctx, fn)` → `SubscriptionReconciler`
  - Same as `computed` but no target control — runs `fn(rc)` for side effects
  - If `fn` returns a cleanup function, called before each re-run and on dispose

- `asyncEffect(ctx, process, onResult)` → `SubscriptionReconciler`
  - `process(rc, signal)` returns a Promise — tracking works across `await` (explicit `rc` object, not global)
  - Reconciliation happens after promise resolves (`.finally()`)
  - If deps change while in-flight: abort current via `AbortSignal`, queue one re-run
  - `onResult(value)` called with resolved value

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
  3. Reset tracker, call render with `(props, { rc, update, controlContext, useComputed })`
  4. After return, **always reconcile subscriptions** (during render, not in effect)
  5. Subscription listener checks `alive` flag — if `false`, listener is a no-op (no `setState`, no re-render)
  6. `useEffect` calls `controlContext.reviveTracker(reconciler)` on mount; cleanup calls `controlContext.markTrackerDead(reconciler)`
  7. Not wrapped in React.memo — Controls are stable mutable references, so shallow prop comparison can't determine re-render need
- `useComputed` hook (constructed per component, passed via ControlsContext):
  1. `useRef` holds target `Control<V>` + `SubscriptionReconciler` (created once via core `computed()`)
  2. Each render: calls core `computed(ctx, target, compute)` to replace computation if function changed
  3. `useEffect` cleanup: `markTrackerDead(reconciler)`; mount: `reviveTracker(reconciler)` (strict mode safe)
  4. Returns the target `Control<V>` — read reactively via `rc.getValue()`

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