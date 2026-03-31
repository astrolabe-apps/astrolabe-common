import type { Control, ControlContext, ReadContext } from "./types";
import { TrackingReadContext, SubscriptionReconciler } from "./readContextImpl";

export interface ComputedRef extends SubscriptionReconciler {
  replaceCompute(newCompute: (rc: ReadContext) => any): void;
}

/**
 * Creates a reactive computation that tracks dependencies via ReadContext
 * and writes the result to a target control. Re-runs when any dependency changes.
 *
 * Returns a ComputedRef (extends SubscriptionReconciler) for lifecycle management:
 * - Non-React: call reconciler.cleanup() to dispose
 * - React: use controlContext.markTrackerDead/reviveTracker for strict mode safety
 * - Call replaceCompute(fn) to swap the compute function and re-run
 */
export function computed<V>(
  ctx: ControlContext,
  target: Control<V>,
  compute: (rc: ReadContext) => V,
): ComputedRef {
  const rc = new TrackingReadContext();
  const reconciler = new SubscriptionReconciler() as ComputedRef;

  let currentCompute: (rc: ReadContext) => V = compute;

  function run() {
    rc.reset();
    const value = currentCompute(rc);
    reconciler.reconcile(rc.tracked);
    ctx.update((wc) => wc.setValue(target, value));
  }

  reconciler.replaceCompute = (newCompute: (rc: ReadContext) => any) => {
    if (newCompute !== currentCompute) {
      currentCompute = newCompute;
      run();
    }
  };

  reconciler.setListener(() => run());
  run();

  return reconciler;
}

export interface EffectRef extends SubscriptionReconciler {
  replaceEffect(newFn: (rc: ReadContext) => (() => void) | void): void;
}

/**
 * Creates a reactive effect that tracks dependencies via ReadContext and
 * re-runs when any dependency changes. Like computed() but for side effects —
 * no target control, no return value written.
 *
 * If the effect function returns a cleanup function, it's called before each
 * re-run and on dispose.
 */
export function effect(
  ctx: ControlContext,
  fn: (rc: ReadContext) => (() => void) | void,
): EffectRef {
  const rc = new TrackingReadContext();
  const reconciler = new SubscriptionReconciler() as EffectRef;

  let currentFn = fn;
  let cleanupFn: (() => void) | void;

  function run() {
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = undefined;
    }
    rc.reset();
    cleanupFn = currentFn(rc);
    reconciler.reconcile(rc.tracked);
  }

  reconciler.replaceEffect = (newFn: (rc: ReadContext) => (() => void) | void) => {
    if (newFn !== currentFn) {
      currentFn = newFn;
      run();
    }
  };

  const origCleanup = reconciler.cleanup.bind(reconciler);
  reconciler.cleanup = () => {
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = undefined;
    }
    origCleanup();
  };

  reconciler.setListener(() => run());
  run();

  return reconciler;
}
