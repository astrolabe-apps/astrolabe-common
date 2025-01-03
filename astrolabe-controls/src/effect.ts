import { collectChanges } from "./controlImpl";
import { addAfterChangesCallback } from "./transactions";
import { SubscriptionTracker } from "./subscriptions";

export class Effect<V> extends SubscriptionTracker {
  previous?: V;
  changedDetected = false;
  runEffect() {
    const next = this.updateCalc();
    const prev = this.previous;
    this.previous = next;
    this.run(next, prev);
  }

  updateCalc() {
    const result = collectChanges(this.collectUsage, () => this.calculate());
    this.update();
    return result;
  }

  constructor(
    public calculate: () => V,
    public run: (v: V, prev: V | undefined) => void,
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
    const result = this.updateCalc();
    this.previous = result;
    this.run(result, undefined);
  }
}
export function createEffect<V>(
  calculate: () => V,
  run: (v: V, prev: V | undefined) => void,
): Effect<V> {
  return new Effect<V>(calculate, run);
}
