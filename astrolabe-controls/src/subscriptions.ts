import {
  ChangeListenerFunc,
  Control,
  ControlChange,
  Subscription,
} from "./types";
import { TrackedSubscription } from "./internal";

export interface SubscriptionInternal extends Subscription {
  list: SubscriptionList;
}
export class Subscriptions {
  private lists: SubscriptionList[] = [];
  public mask: ControlChange = ControlChange.None;
  public onListenerList = false;

  subscribe<V>(
    listener: ChangeListenerFunc<V>,
    current: ControlChange,
    mask: ControlChange,
  ): Subscription {
    let list = this.lists.find((x) => x.canBeAdded(current, mask));
    if (!list) {
      list = new SubscriptionList(current, mask);
      this.lists.push(list);
    }
    this.mask |= mask;
    return list.add(listener, mask);
  }

  unsubscribe(sub: Subscription): void {
    (sub as SubscriptionInternal).list.remove(sub);
  }

  hasSubscriptions(): boolean {
    return this.lists.some((list) => list.hasSubscriptions());
  }

  runListeners(control: Control<any>, current: ControlChange) {
    this.lists.forEach((s) => s.runListeners(control, current));
  }
  runMatchingListeners(control: Control<any>, mask: ControlChange) {
    this.lists.forEach((s) => s.runMatchingListeners(control, mask));
  }

  applyChange(change: ControlChange) {
    this.lists.forEach((x) => x.applyChange(change));
  }
}

export class SubscriptionList {
  private subscriptions: Subscription[] = [];

  constructor(
    private changeState: ControlChange,
    private mask: ControlChange,
  ) {}

  remove(sub: Subscription) {
    this.subscriptions = this.subscriptions.filter((x) => x !== sub);
  }

  runMatchingListeners(control: Control<any>, mask: ControlChange) {
    this.subscriptions.forEach((s) => {
      const change = s.mask & mask;
      if (change) s.listener(control, change);
    });
  }

  runListeners(control: Control<any>, current: ControlChange) {
    const nextCurrent = current & this.mask;
    const actualChange = (nextCurrent ^ this.changeState) as ControlChange;
    this.changeState = nextCurrent;
    if (actualChange) {
      this.runMatchingListeners(control, actualChange);
    }
  }

  applyChange(change: ControlChange) {
    this.changeState |= change & this.mask;
  }
  add<V>(listener: ChangeListenerFunc<V>, mask: ControlChange): Subscription {
    const sub: SubscriptionInternal = {
      list: this,
      mask,
      listener: listener as ChangeListenerFunc<any>,
    };
    this.mask |= mask;
    this.subscriptions.push(sub);
    return sub;
  }

  canBeAdded(current: ControlChange, mask: ControlChange): boolean {
    return (this.changeState & mask) === current;
  }

  hasSubscriptions(): boolean {
    return this.subscriptions.length > 0;
  }
}

export class SubscriptionTracker {
  subscriptions: TrackedSubscription[] = [];

  constructor(public listen: ChangeListenerFunc<any>) {
    (listen as any).tracker = this;
  }

  collectUsage: ChangeListenerFunc<any> = (c, change) => {
    const existing = this.subscriptions.find((x) => x[0] === c);
    if (existing) {
      existing[2] |= change;
    } else {
      this.subscriptions.push([c, c.subscribe(this.listen, change), change]);
    }
  };
  update() {
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
  }

  cleanup() {
    this.subscriptions.forEach((x) => x[1] && x[0].unsubscribe(x[1]));
    this.subscriptions = [];
  }
}
