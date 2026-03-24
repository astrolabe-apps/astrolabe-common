import { ControlImpl, toImpl, ControlFlags } from "./controlImpl";
import type { NotifyFn } from "./controlImpl";
import { ControlChange } from "./types";
import type { Control, WriteContext } from "./types";

export class WriteContextImpl implements WriteContext {
  pending = new Set<ControlImpl>();
  afterChangesCbs: (() => void)[] = [];

  notify: NotifyFn = (control) => {
    this.pending.add(control);
  };

  // ── Value methods ─────────────────────────────────────────────

  setValue<V>(control: Control<V>, value: V): void {
    toImpl(control).setValueImpl(value, this.notify);
  }

  updateValue<V>(control: Control<V>, cb: (current: V) => V): void {
    const c = toImpl(control);
    c.setValueImpl(cb(c._value as V), this.notify);
  }

  setValueAndInitial<V>(control: Control<V>, value: V, initial: V): void {
    const c = toImpl(control);
    c.setValueImpl(value, this.notify);
    c.setInitialValueImpl(initial, this.notify);
  }

  setInitialValue<V>(control: Control<V>, value: V): void {
    toImpl(control).setInitialValueImpl(value, this.notify);
  }

  markAsClean(control: Control<unknown>): void {
    const c = toImpl(control);
    c.setInitialValueImpl(c._value, this.notify);
  }

  // ── Flag methods ──────────────────────────────────────────────

  setTouched(control: Control<unknown>, touched: boolean, notChildren?: boolean): void {
    toImpl(control).setTouchedImpl(touched, this.notify, notChildren);
  }

  setDisabled(control: Control<unknown>, disabled: boolean, notChildren?: boolean): void {
    toImpl(control).setDisabledImpl(disabled, this.notify, notChildren);
  }

  // ── Error methods ─────────────────────────────────────────────

  setError(control: Control<unknown>, key: string, error?: string | null): void {
    toImpl(control).setErrorImpl(key, error, this.notify);
  }

  setErrors(
    control: Control<unknown>,
    errors?: Record<string, string | null | undefined> | null,
  ): void {
    toImpl(control).setErrorsImpl(errors, this.notify);
  }

  clearErrors(control: Control<unknown>): void {
    toImpl(control).clearErrorsImpl(this.notify);
  }

  validate(control: Control<unknown>): boolean {
    return toImpl(control).validate(this.notify, this);
  }

  // ── Array methods ─────────────────────────────────────────────

  addElement<V>(control: Control<V[]>, child: V, index?: number): Control<V> {
    const c = toImpl(control);
    const elems = c.getOrCreateElements();
    const newChild = c._ctx.createChild(child, child, ControlFlags.None);
    const newElems = [...elems];
    if (index !== undefined && index < elems.length) {
      newElems.splice(index, 0, newChild);
    } else {
      newElems.push(newChild);
    }
    this.applyUpdateElements(c, elems, newElems);
    return newChild as unknown as Control<V>;
  }

  removeElement<V>(control: Control<V[]>, child: number | Control<V>): void {
    const c = toImpl(control);
    const elems = c.getOrCreateElements();
    const idx = typeof child === "number" ? child : elems.indexOf(toImpl(child));
    if (idx < 0 || idx >= elems.length) return;
    const newElems = elems.filter((_, i) => i !== idx);
    this.applyUpdateElements(c, elems, newElems);
  }

  updateElements<V>(
    control: Control<V[]>,
    cb: (elems: Control<V>[]) => Control<V>[],
  ): Control<V>[] {
    const c = toImpl(control);
    const oldElems = c.getOrCreateElements();
    const newElems = cb(oldElems as unknown as Control<V>[]) as unknown as ControlImpl[];
    if (
      oldElems === newElems ||
      (oldElems.length === newElems.length &&
        oldElems.every((x, i) => x === newElems[i]))
    )
      return [];
    return this.applyUpdateElements(c, oldElems, newElems) as unknown as Control<V>[];
  }

  afterChanges(cb: () => void): void {
    this.afterChangesCbs.push(cb);
  }

  // ── Flush ─────────────────────────────────────────────────────

  flush(): void {
    // Drain loop: run listeners, which may cause more pending controls
    while (this.pending.size > 0) {
      const snapshot = [...this.pending];
      this.pending.clear();
      for (const c of snapshot) {
        c.runListeners(this);
      }
    }
    // Run afterChanges callbacks
    while (this.afterChangesCbs.length > 0) {
      const cbs = this.afterChangesCbs;
      this.afterChangesCbs = [];
      cbs.forEach((cb) => cb());
      // Listeners triggered by afterChanges callbacks need to drain too
      while (this.pending.size > 0) {
        const snapshot = [...this.pending];
        this.pending.clear();
        for (const c of snapshot) {
          c.runListeners(this);
        }
      }
    }
  }

  // ── Private ───────────────────────────────────────────────────

  private applyUpdateElements(
    parent: ControlImpl,
    oldElems: ControlImpl[],
    newElems: ControlImpl[],
  ): ControlImpl[] {
    const detached = oldElems.filter((x) => !newElems.includes(x));
    // Re-key new elements
    newElems.forEach((x, i) => {
      x.updateParentLink(parent, i);
    });
    // Detach removed
    detached.forEach((x) => {
      x.updateParentLink(parent, undefined);
    });
    parent._elems = newElems;
    parent._flags &= ~ControlFlags.ChildInvalid;
    parent.validityChangedImpl(false, this.notify);
    parent.setValueImpl(
      newElems.map((x) => x._value) as any,
      this.notify,
    );
    parent._subscriptions?.applyChange(ControlChange.Structure);
    this.notify(parent);
    return detached;
  }
}
