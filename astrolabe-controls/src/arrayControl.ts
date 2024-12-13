import {
  ChildState,
  ControlChange,
  ControlFlags,
  ControlImpl,
  SingleParent,
} from "./controlImpl";

export class ArrayControl<V> implements ChildState {
  public _elems: ControlImpl<unknown>[];

  constructor(public control: ControlImpl<any>) {
    const v = (control._value ?? []) as any[];
    const iv = (control._initialValue ?? []) as any[];
    this._elems = v.map((x, i) => {
      return new ControlImpl(
        x,
        iv[i],
        control._flags & ControlFlags.Disabled,
        new SingleParent(this, i),
      );
    });
  }

  getElements(): ControlImpl<V extends Array<infer X> ? X : unknown>[] {
    return this._elems as any;
  }

  updateChildValues(): void {
    const c = this.control;
    const v = (c._value ?? []) as any[];
    const iv = (c._initialValue ?? []) as any[];
    const oldElems = this._elems;
    const newLength = v.length;
    this._elems = v.map((x, i) => {
      const old = oldElems[i];
      if (old) {
        old.setValueImpl(x, c);
        old.setParentAttach(c, i);
        return old;
      }
      return new ControlImpl(
        x,
        iv[i],
        c._flags & ControlFlags.Disabled,
        new SingleParent(this, i),
      );
    });
    if (newLength < oldElems.length) {
      oldElems.slice(newLength).forEach((x) => x.setParentAttach(c, undefined));
    }
    if (c._value == null || newLength != oldElems.length)
      c._subscriptions?.applyChange(ControlChange.Structure);
  }

  updateChildInitialValues(): void {
    const c = this.control;
    const iv = (c._initialValue ?? []) as any[];
    this._elems.forEach((x, i) => {
      x.setInitialValueImpl(iv[i], c);
    });
  }

  childValueChange(prop: string | number, v: unknown): void {
    let c = this.control;
    let curValue = c._value;
    if (!(c._flags & ControlFlags.ValueMutating)) {
      curValue = [...curValue];
      c._value = curValue;
      c._flags |= ControlFlags.ValueMutating;
    }
    (curValue as any)[prop] = v;
    c._subscriptions?.applyChange(ControlChange.Value);
  }

  childInitialValueChange(prop: string | number, v: unknown): void {
    let c = this.control;
    let curValue = c._initialValue;
    if (!(c._flags & ControlFlags.InitialValueMutating)) {
      curValue = [...curValue];
      c._initialValue = curValue;
      c._flags |= ControlFlags.InitialValueMutating;
    }
    (curValue as any)[prop] = v;
    c._subscriptions?.applyChange(ControlChange.InitialValue);
  }

  childFlagChange(prop: string | number, flags: ControlFlags): void {
    throw new Error("Method not implemented.");
  }
}
