import {
  ChildState,
  Control,
  ControlChange,
  ControlFlags,
  ControlImpl,
  SingleParent,
} from "./controlImpl";

export const FieldsProxy: ProxyHandler<ObjectControl<unknown>> = {
  get(target: ObjectControl<unknown>, p: string | symbol, receiver: any): any {
    if (typeof p !== "string") return undefined;
    return target.getField(p);
  },
};

export class ObjectControl<V> implements ChildState {
  private _fields: Record<string, ControlImpl<unknown>> = {};

  constructor(public control: ControlImpl<any>) {}

  updateChildValues(): void {
    const c = this.control;
    const v = c._value;
    Object.entries(this._fields).forEach(([k, fv]) => {
      const cv = v != null ? (v as any)[k] : undefined;
      fv.setValueImpl(cv, c);
    });
  }

  updateChildInitialValues(): void {
    const c = this.control;
    const v = c._initialValue;
    Object.entries(this._fields).forEach(([k, fv]) => {
      const cv = v != null ? (v as any)[k] : undefined;
      fv.setInitialValueImpl(cv, c);
    });
  }

  getFields(): {
    [K in keyof NonNullable<V>]-?: Control<NonNullable<V>[K]>;
  } {
    return new Proxy<any>(this, FieldsProxy);
  }

  getField(p: string): ControlImpl<unknown> {
    if (p in this._fields) {
      return this._fields[p];
    }
    const { _value, _initialValue } = this.control;
    const v = _value != null ? (_value as any)[p] : undefined;
    const iv = _initialValue != null ? (_initialValue as any)[p] : undefined;
    const c = new ControlImpl(
      v,
      iv,
      this.control._flags & ControlFlags.Disabled,
      new SingleParent(this, p),
    );
    this._fields[p] = c;
    return c;
  }

  childValueChange(prop: string | number, v: V): void {
    let c = this.control;
    let curValue = c._value;
    if (!(c._flags & ControlFlags.ValueMutating) || curValue == null) {
      curValue = { ...curValue };
      c._value = curValue;
      c._flags |= ControlFlags.ValueMutating;
    }
    (curValue as any)[prop] = v;
    c._subscriptions?.applyChange(ControlChange.Value);
  }

  childInitialValueChange(prop: string | number, v: V): void {
    let c = this.control;
    let curValue = c._initialValue;
    if (!(c._flags & ControlFlags.InitialValueMutating) || curValue == null) {
      curValue = { ...curValue };
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
