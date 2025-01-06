import { InternalControl } from "./internal";
import { Control } from "./types";

let transactionCount = 0;
let runListenerList: InternalControl<any>[] = [];
let afterChangesCallbacks: (() => void)[] = [];

export function runPendingChanges() {
  while (
    transactionCount == 0 &&
    (afterChangesCallbacks.length || runListenerList.length)
  ) {
    try {
      unsafeFreezeCountEdit(1);
      if (runListenerList.length == 0) {
        const cbToRun = afterChangesCallbacks;
        afterChangesCallbacks = [];
        cbToRun.forEach((cb) => cb());
      } else {
        const listenersToRun = runListenerList;
        runListenerList = [];
        listenersToRun.forEach(
          (c) => (c._subscriptions!.onListenerList = false),
        );
        listenersToRun.forEach((c) => c.runListeners());
      }
    } finally {
      unsafeFreezeCountEdit(-1);
    }
  }
}
export function unsafeFreezeCountEdit(dir: number) {
  transactionCount += dir;
}

export function addAfterChangesCallback(cb: () => void) {
  afterChangesCallbacks.push(cb);
}
export function groupedChanges<A>(run: () => A): A {
  unsafeFreezeCountEdit(1);
  try {
    return run();
  } finally {
    unsafeFreezeCountEdit(-1);
    runPendingChanges();
  }
}

export function runTransaction(control: Control<any>, run: () => void): void {
  unsafeFreezeCountEdit(1);
  try {
    run();
  } catch (e) {
    console.error("Error in control", e);
  }

  const c = control as InternalControl<any>;
  const sub = c._subscriptions;
  if (transactionCount > 1) {
    if (sub && !sub.onListenerList) {
      sub.onListenerList = true;
      runListenerList.push(c);
    }
    unsafeFreezeCountEdit(-1);
  } else {
    if (!runListenerList.length && sub) {
      c.runListeners();
    } else {
      if (sub) runListenerList.push(c);
    }
    unsafeFreezeCountEdit(-1);
    runPendingChanges();
  }
}
