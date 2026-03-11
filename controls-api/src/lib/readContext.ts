import {
  Control,
  ControlChange,
  ChangeListenerFunc,
  SubscriptionTracker,
} from "@astroapps/controls";

/**
 * ReadContext — explicit reactive read context.
 * Reading through it registers a dependency on the control+property pair.
 */
export interface ReadContext {
  getValue<V>(control: Control<V>): V;
  getInitialValue<V>(control: Control<V>): V;
  isValid(control: Control<unknown>): boolean;
  isDirty(control: Control<unknown>): boolean;
  isTouched(control: Control<unknown>): boolean;
  isDisabled(control: Control<unknown>): boolean;
  isNull(control: Control<unknown>): boolean;
  getError(control: Control<unknown>): string | null | undefined;
  getErrors(control: Control<unknown>): Record<string, string>;
  getElements<V>(control: Control<V[]>): Control<V>[];
}

/**
 * TrackingReadContext — wraps SubscriptionTracker to register dependencies
 * on each read. After the render/effect function returns, call `update()` to
 * reconcile subscriptions. Call `cleanup()` on unmount.
 */
export class TrackingReadContext implements ReadContext {
  private tracker: SubscriptionTracker;

  constructor(listener: ChangeListenerFunc<any>) {
    this.tracker = new SubscriptionTracker(listener);
  }

  getValue<V>(control: Control<V>): V {
    this.tracker.collectUsage(control, ControlChange.Value);
    return control.current.value;
  }

  getInitialValue<V>(control: Control<V>): V {
    this.tracker.collectUsage(control, ControlChange.InitialValue);
    return control.current.initialValue;
  }

  isValid(control: Control<unknown>): boolean {
    this.tracker.collectUsage(control, ControlChange.Valid);
    return control.current.valid;
  }

  isDirty(control: Control<unknown>): boolean {
    this.tracker.collectUsage(control, ControlChange.Dirty);
    return control.current.dirty;
  }

  isTouched(control: Control<unknown>): boolean {
    this.tracker.collectUsage(control, ControlChange.Touched);
    return control.current.touched;
  }

  isDisabled(control: Control<unknown>): boolean {
    this.tracker.collectUsage(control, ControlChange.Disabled);
    return control.current.disabled;
  }

  isNull(control: Control<unknown>): boolean {
    this.tracker.collectUsage(control, ControlChange.Structure);
    return control.current.isNull;
  }

  getError(control: Control<unknown>): string | null | undefined {
    this.tracker.collectUsage(control, ControlChange.Error);
    return control.current.error;
  }

  getErrors(control: Control<unknown>): Record<string, string> {
    this.tracker.collectUsage(control, ControlChange.Error);
    return control.current.errors;
  }

  getElements<V>(control: Control<V[]>): Control<V>[] {
    this.tracker.collectUsage(control, ControlChange.Structure);
    return control.current.elements as unknown as Control<V>[];
  }

  /** Reconcile subscriptions after render/effect completes */
  update(): void {
    this.tracker.update();
  }

  /** Unsubscribe all on unmount/teardown */
  cleanup(): void {
    this.tracker.cleanup();
  }
}

/**
 * noopReadContext — returns snapshot values without subscribing.
 * Useful for tests, one-shot reads, or event handlers.
 */
export const noopReadContext: ReadContext = {
  getValue<V>(control: Control<V>): V {
    return control.current.value;
  },
  getInitialValue<V>(control: Control<V>): V {
    return control.current.initialValue;
  },
  isValid(control: Control<unknown>): boolean {
    return control.current.valid;
  },
  isDirty(control: Control<unknown>): boolean {
    return control.current.dirty;
  },
  isTouched(control: Control<unknown>): boolean {
    return control.current.touched;
  },
  isDisabled(control: Control<unknown>): boolean {
    return control.current.disabled;
  },
  isNull(control: Control<unknown>): boolean {
    return control.current.isNull;
  },
  getError(control: Control<unknown>): string | null | undefined {
    return control.current.error;
  },
  getErrors(control: Control<unknown>): Record<string, string> {
    return control.current.errors;
  },
  getElements<V>(control: Control<V[]>): Control<V>[] {
    return control.current.elements as unknown as Control<V>[];
  },
};
