import {
  collectChanges,
  makeChangeTracker,
  setChangeCollector,
} from "./controlImpl";
import {
  ChangeListenerFunc,
  Control,
  ControlChange,
  Subscription,
} from "./types";
import { addAfterChangesCallback } from "./transactions";

type TrackedSubscription = [
  Control<any>,
  Subscription | undefined,
  ControlChange,
];

export class Effect<V> {
  previous?: V;
  subscriptions: TrackedSubscription[] = [];
  changedDetected = false;
  listen: ChangeListenerFunc<any> = (control, change) => {
    if (this.changedDetected) {
      return;
    }
    this.changedDetected = true;
    addAfterChangesCallback(() => {
      this.changedDetected = false;
      const next = this.updateCalc();
      const prev = this.previous;
      this.previous = next;
      this.run(next, prev);
    });
  };
  listenCalc: ChangeListenerFunc<any> = (c, change) => {
    const existing = this.subscriptions.find((x) => x[0] === c);
    if (existing) {
      existing[2] |= change;
    } else {
      this.subscriptions.push([c, c.subscribe(this.listen, change), change]);
    }
  };

  updateCalc() {
    const result = collectChanges(this.listenCalc, () => this.calculate());
    let removed = false;
    this.subscriptions.forEach((sub) => {
      const [c, s, latest] = sub;
      if (s) {
        if (s.mask !== latest) {
          c.unsubscribe(s);
          if (!latest) {
            removed = true;
            sub[1] = undefined;
          } else sub[1] = c.subscribe(this.listen, latest);
        }
      } else {
        sub[1] = c.subscribe(this.listen, latest);
      }
      sub[2] = 0;
    });
    if (removed) this.subscriptions = this.subscriptions.filter((x) => x[1]);
    return result;
  }

  constructor(
    public calculate: () => V,
    public run: (v: V, prev: V | undefined) => void,
  ) {
    const result = this.updateCalc();
    this.previous = result;
    this.run(result, undefined);
  }

  cleanup() {
    this.subscriptions.forEach((x) => x[1] && x[0].unsubscribe(x[1]));
  }
}
export function createEffect<V>(
  calculate: () => V,
  run: (v: V, prev: V | undefined) => void,
): Effect<V> {
  return new Effect<V>(calculate, run);
}
