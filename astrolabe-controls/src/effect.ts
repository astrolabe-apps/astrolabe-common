import { collectChanges, createCleanupScope } from "./controlImpl";
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

export function createSyncEffect<V>(
  process: () => V,
  cleanupScope: CleanupScope,
): Effect<V> {
  const effect = new Effect<V>(process, () => {});
  cleanupScope.addCleanup(() => effect.cleanup());
  return effect;
}

export function createScopedEffect<V>(
  process: (scope: CleanupScope) => V,
  parentScope: CleanupScope,
): Effect<V> {
  const cleanup = createCleanupScope();
  const effect = new Effect<V>(
    () => {
      cleanup.cleanup();
      return process(cleanup);
    },
    () => {},
  );
  parentScope.addCleanup(() => {
    effect.cleanup();
    cleanup.cleanup();
  });
  return effect;
}

export class AsyncEffect<V> extends SubscriptionTracker {
  currentPromise: Promise<V>;
  abortController?: AbortController;
  changedDetected = false;
  destroyed = false;
  pendingRun = false;

  runProcess() {
    if (this.pendingRun) {
      return; // Already have a run queued
    }

    this.pendingRun = true;
    this.abortController?.abort();
    const aborter = new AbortController();
    this.abortController = aborter;

    this.currentPromise = this.currentPromise
      .then(() =>
        collectChanges(this.collectUsage, () =>
          this.process(this, aborter.signal),
        ),
      )
      .finally(() => {
        this.pendingRun = false;
        if (!this.destroyed) {
          this.update();
        }
      });
  }

  start() {
    this.runProcess();
  }

  cleanup() {
    this.destroyed = true;
    this.abortController?.abort();
    super.cleanup();
  }

  constructor(
    public process: (effect: AsyncEffect<V>, signal: AbortSignal) => Promise<V>,
  ) {
    super((control, change) => {
      if (this.changedDetected) {
        return;
      }
      this.changedDetected = true;
      addAfterChangesCallback(() => {
        this.changedDetected = false;
        this.runProcess();
      });
    });

    // Initialize currentPromise to prevent race condition
    this.currentPromise = Promise.resolve({} as V);
  }
}

export function createAsyncEffect<V>(
  process: (effect: AsyncEffect<V>, signal: AbortSignal) => Promise<V>,
  cleanupScope: CleanupScope,
): AsyncEffect<V> {
  const effect = new AsyncEffect<V>(process);
  cleanupScope.addCleanup(() => effect.cleanup());
  return effect;
}
