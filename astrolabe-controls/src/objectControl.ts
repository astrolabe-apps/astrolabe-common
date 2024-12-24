import { ChildState, ControlFlags, InternalControl } from "./internal";
import { Control, ControlChange, ControlFields, ControlValue } from "./types";

export const FieldsProxy: ProxyHandler<ObjectControl<unknown>> = {
  get(target: ObjectControl<unknown>, p: string | symbol, receiver: any): any {
    if (typeof p !== "string") return undefined;
    return target.getField(p);
  },
};

export class ObjectControl<V> implements ChildState {
  private _fields: Record<string, InternalControl<unknown>> = {};

  constructor(public control: InternalControl<unknown>) {}

  setTouched(b: boolean) {
    Object.values(this._fields).forEach((x) => x.setTouched(b));
  }

  setDisabled(b: boolean) {
    Object.values(this._fields).forEach((x) => x.setDisabled(b));
  }

  allValid(): boolean {
    console.log("allValid-object", this.control._value);
    const c = this.control as InternalControl<Record<string, unknown>>;
    return Object.keys(c._value).every((x) => {
      const v =
        this._fields[x]?.valid ??
        !c._setup?.fields?.[x]?.validator?.(c._value[x]);
      console.log({ x, v });
      return v;
    });
  }

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

  getFields(): ControlFields<NonNullable<V>> {
    return new Proxy<any>(this, FieldsProxy);
  }

  getField(p: string): InternalControl<unknown> {
    if (p in this._fields) {
      return this._fields[p];
    }
    const { _value, _initialValue } = this.control;
    const v = _value != null ? (_value as any)[p] : undefined;
    const iv = _initialValue != null ? (_initialValue as any)[p] : undefined;
    const c = this.control.newChild(v, iv, p, this);
    this._fields[p] = c;
    return c;
  }

  childValueChange(prop: string | number, v: V): void {
    // console.log("childValueChange-object", { prop, v });

    let c = this.control;
    let curValue = c._value as any;
    if (
      !(c._flags & ControlFlags.ValueMutating) ||
      curValue == null ||
      c._parents
    ) {
      curValue = { ...curValue };
      c._flags |= ControlFlags.ValueMutating;
    }
    curValue[prop] = v;
    c.applyValueChange(curValue, false);
  }

  childFlagChange(prop: string | number, flags: ControlFlags): void {
    throw new Error("Method not implemented. childFlagChange");
  }
}

export function setFields<V, OTHER extends { [p: string]: any }>(
  control: Control<V>,
  fields: {
    [K in keyof OTHER]-?: Control<OTHER[K]>;
  },
): Control<V & OTHER> {
  throw new Error("Method not implemented. setFields");
}

export function controlGroup<C extends { [k: string]: Control<unknown> }>(
  fields: C,
): Control<{ [K in keyof C]: ControlValue<C[K]> }> {
  throw new Error("Method not implemented. controlGroup");
}
