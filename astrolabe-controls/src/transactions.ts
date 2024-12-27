import { InternalControl } from "./internal";
import { Control } from "./types";

let transactionCount = 0;
let runListenerList: InternalControl<any>[] = [];
let afterChangesCallbacks: (() => void)[] = [];

export function runPendingChanges() {}
export function unsafeFreezeCountEdit(dir: number) {
  if (dir == 1) transactionCount++;
  else commit(undefined);
}

export function addAfterChangesCallback(cb: () => void) {
  afterChangesCallbacks.push(cb);
}
export function groupedChanges<A>(run: () => A): A {
  transactionCount++;
  try {
    return run();
  } finally {
    commit(undefined);
  }
}

export function runTransaction(control: Control<any>, run: () => void): void {
  transactionCount++;
  try {
    run();
  } finally {
    commit(control as InternalControl<unknown>);
  }
}

export function commit(control?: InternalControl<unknown>) {
  const sub = control?._subscriptions;
  if (transactionCount > 1) {
    if (sub && !sub.onListenerList) {
      sub.onListenerList = true;
      runListenerList.push(control);
    }
    transactionCount--;
    return;
  } else {
    if (!runListenerList.length && sub) {
      control!.runListeners();
    } else {
      if (sub) runListenerList.push(control);
    }
    while (transactionCount === 1) {
      while (runListenerList.length > 0) {
        const listenersToRun = runListenerList;
        runListenerList = [];
        listenersToRun.forEach(
          (c) => (c._subscriptions!.onListenerList = false),
        );
        listenersToRun.forEach((c) => c.runListeners());
      }
      const cbToRun = afterChangesCallbacks;
      afterChangesCallbacks = [];
      cbToRun.forEach((cb) => cb());
      transactionCount--;
    }
  }
}
