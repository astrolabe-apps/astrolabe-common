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
