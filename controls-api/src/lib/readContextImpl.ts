import { ControlImpl, toImpl } from "./controlImpl";
import { ControlChange } from "./types";
import type { Control, ReadContext, Subscription } from "./types";

// ── NoopReadContext ─────────────────────────────────────────────────

export const noopReadContext: ReadContext = {
  getValue<V>(control: Control<V>): V {
    return control.valueNow;
  },
  getInitialValue<V>(control: Control<V>): V {
    return control.initialValueNow;
  },
  isValid(control: Control<unknown>): boolean {
    return control.validNow;
  },
  isDirty(control: Control<unknown>): boolean {
    return control.dirtyNow;
  },
  isTouched(control: Control<unknown>): boolean {
    return control.touchedNow;
  },
  isDisabled(control: Control<unknown>): boolean {
    return control.disabledNow;
  },
  isNull(control: Control<unknown>): boolean {
    return control.isNullNow;
  },
  getError(control: Control<unknown>): string | null | undefined {
    return control.errorNow;
  },
  getErrors(control: Control<unknown>): Record<string, string> {
    return control.errorsNow;
  },
  getElements<V>(control: Control<V[]>): Control<V>[] {
    return control.elements as unknown as Control<V>[];
  },
};

// ── TrackingReadContext ──────────────────────────────────────────────

export class TrackingReadContext implements ReadContext {
  tracked = new Map<ControlImpl, ControlChange>();

  private track(control: Control<any>, change: ControlChange): ControlImpl {
    const c = toImpl(control);
    const existing = this.tracked.get(c);
    if (existing !== undefined) {
      this.tracked.set(c, existing | change);
    } else {
      this.tracked.set(c, change);
    }
    return c;
  }

  reset(): void {
    this.tracked.clear();
  }

  getValue<V>(control: Control<V>): V {
    return this.track(control, ControlChange.Value)._value as V;
  }

  getInitialValue<V>(control: Control<V>): V {
    return this.track(control, ControlChange.InitialValue)._initialValue as V;
  }

  isValid(control: Control<unknown>): boolean {
    const c = this.track(control, ControlChange.Valid);
    return c.isValid();
  }

  isDirty(control: Control<unknown>): boolean {
    const c = this.track(control, ControlChange.Dirty);
    return c.dirtyNow;
  }

  isTouched(control: Control<unknown>): boolean {
    const c = this.track(control, ControlChange.Touched);
    return c.touchedNow;
  }

  isDisabled(control: Control<unknown>): boolean {
    const c = this.track(control, ControlChange.Disabled);
    return c.disabledNow;
  }

  isNull(control: Control<unknown>): boolean {
    const c = this.track(control, ControlChange.Structure);
    return c.isNullNow;
  }

  getError(control: Control<unknown>): string | null | undefined {
    const c = this.track(control, ControlChange.Error);
    return c.errorNow;
  }

  getErrors(control: Control<unknown>): Record<string, string> {
    const c = this.track(control, ControlChange.Error);
    return c.errorsNow;
  }

  getElements<V>(control: Control<V[]>): Control<V>[] {
    const c = this.track(control, ControlChange.Structure);
    return c.getOrCreateElements() as unknown as Control<V>[];
  }
}

// ── SubscriptionReconciler ──────────────────────────────────────────

interface TrackedSub {
  control: ControlImpl;
  subscription: Subscription;
  mask: ControlChange;
}

export class SubscriptionReconciler {
  alive = true;
  private subs: TrackedSub[] = [];
  private listener: ((control: Control<any>, change: ControlChange) => void) | undefined;

  setListener(listener: (control: Control<any>, change: ControlChange) => void): void {
    this.listener = listener;
  }

  reconcile(tracked: Map<ControlImpl, ControlChange>): void {
    const newSubs: TrackedSub[] = [];

    // For each tracked control, find or create subscription
    for (const [control, mask] of tracked) {
      const existing = this.subs.find(
        (s) => s.control === control,
      );
      if (existing) {
        if (existing.mask !== mask) {
          // Mask changed — unsubscribe and resubscribe
          control.unsubscribe(existing.subscription);
          const sub = control.subscribe(this.wrappedListener, mask);
          newSubs.push({ control, subscription: sub, mask });
        } else {
          newSubs.push(existing);
        }
      } else {
        // New subscription
        const sub = control.subscribe(this.wrappedListener, mask);
        newSubs.push({ control, subscription: sub, mask });
      }
    }

    // Unsubscribe any that are no longer tracked
    for (const s of this.subs) {
      if (!tracked.has(s.control)) {
        s.control.unsubscribe(s.subscription);
      }
    }

    this.subs = newSubs;
  }

  private wrappedListener = (control: Control<any>, change: ControlChange) => {
    if (this.alive && this.listener) {
      this.listener(control, change);
    }
  };

  cleanup(): void {
    for (const s of this.subs) {
      s.control.unsubscribe(s.subscription);
    }
    this.subs = [];
  }
}
