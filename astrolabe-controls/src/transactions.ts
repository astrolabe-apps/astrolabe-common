import { InternalControl } from "./internal";
import { Control } from "./types";

let transactionCount = 0;
let runListenerList: InternalControl<any>[] = [];

export function runPendingChanges() {}
export function unsafeFreezeCountEdit(dir: number) {
  if (dir == 1) transactionCount++;
  else commit(undefined);
}

export function addAfterChangesCallback(cb: () => void) {}
export function groupedChanges<A>(run: () => A): A {
  transactionCount++;
  try {
    return run();
  } finally {
    commit(undefined);
  }
}

export function runTransaction(
  control: Control<any>,
  run: () => boolean,
): boolean {
  transactionCount++;
  let shouldRunListeners;
  try {
    shouldRunListeners = run();
  } catch (e) {
    console.error("Error in control", e);
    shouldRunListeners = false;
  }
  commit(
    shouldRunListeners ? (control as InternalControl<unknown>) : undefined,
  );
  return shouldRunListeners;
}

export function commit(control?: InternalControl<unknown>) {
  const sub = control?._subscriptions;
  if (transactionCount > 1) {
    if (sub) {
      sub.onListenerList = true;
      runListenerList.push(control);
    }
  } else {
    if (!runListenerList.length && sub) {
      control!.runListeners();
    } else {
      if (sub) runListenerList.push(control);
      while (runListenerList.length > 0) {
        const listenersToRun = runListenerList;
        runListenerList = [];
        listenersToRun.forEach(
          (c) => (c._subscriptions!.onListenerList = false),
        );
        listenersToRun.forEach((c) => c.runListeners());
      }
    }
  }
  transactionCount--;
}
