import {
  ChangeListenerFunc,
  Control,
  ControlChange,
  Subscription,
} from "./controlImpl";

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
    sub.list.remove(sub);
  }

  runListeners(control: Control<any>, current: ControlChange) {
    this.lists.forEach((s) => s.runListeners(control, current));
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

  runListeners(control: Control<any>, current: ControlChange) {
    const nextCurrent = current & this.mask;
    const actualChange = (nextCurrent ^ this.changeState) as ControlChange;
    this.changeState = nextCurrent;
    if (actualChange) {
      this.subscriptions.forEach((s) => {
        const change = s.mask & actualChange;
        if (change) s.listener(control, change);
      });
    }
  }

  applyChange(change: ControlChange) {
    this.changeState |= change & this.mask;
  }
  add<V>(listener: ChangeListenerFunc<V>, mask: ControlChange): Subscription {
    const sub: Subscription = {
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
}
