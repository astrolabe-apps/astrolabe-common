import { Control } from "./types";
import {
  ControlFlags,
  ControlLogic,
  InternalControl,
  ParentLink,
} from "./internal";

export class ObjectLogic extends ControlLogic {
  _fields: Record<string, InternalControl> = {};

  constructor(
    isEqual: (v1: unknown, v2: unknown) => boolean,
    private makeChild: (
      p: string,
      v: unknown,
      iv: unknown,
      flags: ControlFlags,
    ) => InternalControl,
  ) {
    super(isEqual);
  }
  getField(p: string): InternalControl {
    if (Object.hasOwn(this._fields, p)) {
      return this._fields[p];
    }
    const tc = this.control;
    const v = (tc._value as any)?.[p];
    const iv = (tc._initialValue as any)?.[p];
    const child = this.makeChild(
      p,
      v,
      iv,
      tc._flags & (ControlFlags.Disabled | ControlFlags.Touched),
    );
    child.updateParentLink(this.control, p);
    return (this._fields[p] = child);
  }

  getElements(): InternalControl[] {
    throw new Error("This is an object control, not an array control.");
  }
  withChildren(f: (c: InternalControl) => void): void {
    Object.values(this._fields).forEach(f);
  }

  copy(v: unknown): Record<string, unknown> {
    return v == null ? {} : { ...v };
  }

  childValueChange(prop: string | number, v: unknown) {
    const copied = this.copy(this.control._value);
    copied[prop] = v;
    this.control.setValueImpl(copied);
  }
  valueChanged(from?: InternalControl) {
    const ov = this.control._value as Record<string, unknown> | null;
    Object.entries(this._fields).forEach(([k, c]) => {
      c.setValueImpl(ov?.[k], this.control);
    });
    super.valueChanged(from);
  }

  initialValueChanged() {
    const ov = this.control._initialValue as Record<string, unknown> | null;
    Object.entries(this._fields).forEach(([k, c]) => {
      c.setInitialValueImpl(ov?.[k]);
    });
  }

  childrenValid(): boolean {
    return Object.values(this._fields).every((c) => c.isValid());
  }

  setFields(fields: Record<string, InternalControl>) {
    this.withChildren((x) => x.updateParentLink(this.control, undefined));
    Object.entries(fields).forEach(([k, f]) => {
      (f as InternalControl).updateParentLink(this.control, k);
    });
    this._fields = { ...fields } as unknown as Record<string, InternalControl>;
    const v = (this.control._value ?? {}) as Record<string, unknown>;
    const iv = (this.control._initialValue ?? {}) as Record<string, unknown>;
    Object.entries(fields).forEach(([k, f]) => {
      v[k] = f.value;
      iv[k] = f.initialValue;
    });
    this.control.setValueAndInitial(v, iv);
  }
}

export function setFields<V, OTHER extends { [p: string]: unknown }>(
  control: Control<V>,
  fields: {
    [K in keyof OTHER]-?: Control<OTHER[K]>;
  },
): Control<V & OTHER> {
  const c = control as InternalControl<V>;
  const oc = c._logic as ObjectLogic;
  oc.setFields({ ...oc._fields, ...fields } as any);
  return control as any;
}
