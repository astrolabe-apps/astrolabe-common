import { collectChanges } from "./controlImpl";
import { addAfterChangesCallback } from "./transactions";
import { SubscriptionTracker } from "./subscriptions";
import { CleanupScope } from "./types";

export class Effect<V> extends SubscriptionTracker {
  changedDetected = false;
  runEffect() {
    this.run(this.updateCalc());
  }

  updateCalc() {
    const result = collectChanges(this.collectUsage, () => this.calculate());
    this.update();
    return result;
  }

  constructor(
    public calculate: () => V,
    public run: (v: V) => void,
  ) {
    super((control, change) => {
      if (this.changedDetected) {
        return;
      }
      this.changedDetected = true;
      addAfterChangesCallback(() => {
        this.changedDetected = false;
        this.runEffect();
      });
    });
    this.run(this.updateCalc());
  }
}
export function createEffect<V>(
  calculate: () => V,
  run: (v: V) => void,
  cleanupScope?: CleanupScope,
): Effect<V> {
  const effect = new Effect<V>(calculate, run);
  cleanupScope?.addCleanup(() => effect.cleanup());
  return effect;
}
