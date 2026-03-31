import { ControlImpl, toImpl } from "./controlImpl";
import { ControlChange } from "./types";
import type { Control, ReadContext, Subscription } from "./types";

// ── getValueRx implementation ───────────────────────────────────────

/**
 * Recursively creates a reactive proxy over a control's value.
 * Object/array property access is routed through child controls,
 * giving fine-grained dependency tracking.
 *
 * This works well for **pure data trees** where the control structure
 * mirrors the data shape (e.g. `{name: "Alice", address: {city: "NYC"}}`).
 * It does NOT work for controls whose values contain domain objects
 * (e.g. `SchemaDataNode`) — those objects' properties would be incorrectly
 * routed through lazy child controls that don't represent real data fields.
 */
function createValueRxProxy<V>(control: Control<V>, rc: ReadContext): V {
  const value = control.valueNow;
  if (value == null) {
    rc.isNull(control); // track Structure
    return value;
  }
  if (typeof value !== "object") {
    rc.getValue(control); // track Value for primitives
    return value;
  }
  // Object or array — track Structure (for null transitions / array length),
  // return a proxy that recurses into child controls
  if (Array.isArray(value)) {
    const elements = rc.getElements(control as unknown as Control<unknown[]>);
    return new Proxy(value, {
      get(target, p, receiver) {
        if (p === "length") return elements.length;
        if (typeof p === "symbol" || typeof p !== "string")
          return Reflect.get(target, p, receiver);
        const idx = Number(p);
        if (Number.isInteger(idx) && idx >= 0 && idx < elements.length) {
          return createValueRxProxy(elements[idx], rc);
        }
        return Reflect.get(target, p, receiver);
      },
    }) as V;
  }
  // Plain object — proxy field access through control.fields
  rc.isNull(control); // track Structure for null transitions
  return new Proxy(value as object, {
    get(target, p, receiver) {
      if (typeof p === "symbol") return Reflect.get(target, p, receiver);
      const child = (control.fields as Record<string, Control<any>>)[p];
      if (child) return createValueRxProxy(child, rc);
      return Reflect.get(target, p, receiver);
    },
  }) as V;
}

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
  getValueRx<V>(control: Control<V>): V {
    return createValueRxProxy(control, this);
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

  getValueRx<V>(control: Control<V>): V {
    return createValueRxProxy(control, this);
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
