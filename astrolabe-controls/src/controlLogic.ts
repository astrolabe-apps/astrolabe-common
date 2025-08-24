import {
  ControlFlags,
  ControlLogic,
  InternalControl,
  ResolvedControlSetup,
} from "./internal";
import { ControlChange, ControlSetup } from "./types";
import { ControlImpl, deepEquals, resolveSetup } from "./controlImpl";

export class ConfiguredControlLogic extends ControlLogic {
  setup: ResolvedControlSetup;
  withChildren(f: (c: InternalControl) => void): void {}
  constructor(_setup: ControlSetup<any>) {
    const setup = resolveSetup(_setup);
    super(setup.equals);
    this.setup = setup;
  }

  attach(c: InternalControl): ControlLogic {
    super.attach(c);
    const { meta, elems, fields, validator: v, afterCreate } = this.setup;
    if (v !== undefined) {
      const runValidation = () => c.setError("default", v?.(c.current.value));
      runValidation();
      c.subscribe(runValidation, ControlChange.Value | ControlChange.Validate);
      c._flags |= ControlFlags.DontClearError;
    }
    if (fields) {
      Object.entries(fields).forEach(([k, fc]) => {
        if (fc?.validator !== undefined) this.getField(k);
      });
    } else if (elems) {
      this.getElements();
    }
    if (meta) Object.assign(c.meta, meta);
    afterCreate?.(c);
    return this;
  }

  ensureObject(): ControlLogic {
    const objectLogic = new ObjectLogic(this.isEqual, (p, v, iv, flags) => {
      const fieldSetup = this.setup.fields?.[p];
      return new ControlImpl(
        v,
        iv,
        flags,
        fieldSetup
          ? new ConfiguredControlLogic(fieldSetup)
          : new DefaultControlLogic(),
      );
    });
    return objectLogic.attach(this.control);
  }

  getField(p: string): InternalControl {
    return this.ensureObject().getField(p);
  }

  ensureArray(): ControlLogic {
    const arrayLogic = new ArrayLogic(this.isEqual, (v, iv, flags) => {
      const elemSetup = this.setup.elems;
      return new ControlImpl(
        v,
        iv,
        flags,
        elemSetup
          ? new ConfiguredControlLogic(elemSetup)
          : new DefaultControlLogic(),
      );
    });
    return arrayLogic.attach(this.control);
  }

  getElements(): InternalControl[] {
    return this.ensureArray().getElements();
  }
}

export class DefaultControlLogic extends ControlLogic {
  constructor() {
    super(deepEquals);
  }

  withChildren(f: (c: InternalControl) => void): void {}

  ensureObject(): ControlLogic {
    const objectLogic = new ObjectLogic(
      this.isEqual,
      (p, v, iv, flags) =>
        new ControlImpl(v, iv, flags, new DefaultControlLogic()),
    );
    objectLogic.attach(this.control);
    return objectLogic;
  }

  getField(p: string): InternalControl {
    return this.ensureObject().getField(p);
  }

  ensureArray(): ControlLogic {
    const arrayLogic = new ArrayLogic(
      this.isEqual,
      (v, iv, flags) =>
        new ControlImpl(v, iv, flags, new DefaultControlLogic()),
    );
    arrayLogic.attach(this.control);
    return arrayLogic;
  }

  getElements(): InternalControl[] {
    return this.ensureArray().getElements();
  }
}

export class ArrayLogic extends ControlLogic {
  _elems!: InternalControl[];

  constructor(
    isEqual: (v1: unknown, v2: unknown) => boolean,
    public makeChild: (
      v: unknown,
      iv: unknown,
      flags: ControlFlags,
    ) => InternalControl,
  ) {
    super(isEqual);
  }

  getField(p: string): InternalControl {
    throw new Error("This is an array control, not an object control.");
  }

  ensureObject(): ControlLogic {
    throw new Error("This is an array control, not an object control.");
  }

  ensureArray(): ControlLogic {
    return this;
  }

  getElements(): InternalControl[] {
    if (!this._elems) {
      this.updateFromValue([]);
    }
    return this._elems;
  }

  updateFromValue(
    existing: InternalControl[],
    noInitial?: boolean,
    noValue?: boolean,
  ): void {
    const tc = this.control;
    const origLength = existing.length;
    const v = (tc._value as unknown[]) ?? [];
    const iv = (tc._initialValue as unknown[]) ?? [];
    const flags = tc._flags & (ControlFlags.Disabled | ControlFlags.Touched);
    const newElems = v.map((x, i) => {
      let child: InternalControl;
      if (i < origLength) {
        child = existing[i];
        if (!noValue) child.setValueImpl(x, this.control);
        if (!noInitial) {
          child.setInitialValueImpl(iv[i]);
          child.updateParentLink(this.control, i, true);
        }
      } else {
        child = this.makeChild(x, iv[i], flags);
        child.updateParentLink(this.control, i, !noInitial);
      }
      return child;
    });
    if (noInitial && newElems.length != origLength) {
      tc._subscriptions?.applyChange(ControlChange.Structure);
    }
    if (newElems.length < origLength) {
      existing
        .slice(newElems.length)
        .forEach((x) => x.updateParentLink(this.control, undefined));
    }
    this._elems = newElems;
  }

  valueChanged() {
    this.updateFromValue(this._elems, true);
  }

  initialValueChanged() {
    this.updateFromValue(this._elems, false, true);
  }

  withChildren(f: (c: InternalControl) => void): void {
    this.getElements().forEach(f);
  }

  copy(v: unknown): unknown[] {
    return v == null ? [] : [...(v as unknown[])];
  }

  childValueChange(prop: string | number, v: unknown) {
    const copied = this.copy(this.control._value);
    copied[prop as number] = v;
    this.control.setValueImpl(copied);
  }

  childrenValid(): boolean {
    return this._elems.every((x) => x.isValid());
  }
}

export class ObjectLogic extends ControlLogic {
  _fields: Record<string, InternalControl> = Object.create(null);

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

  ensureObject(): ControlLogic {
    return this;
  }

  getField(p: string): InternalControl {
    if (Object.hasOwn(this._fields, p)) {
      return this._fields[p];
    }
    const tc = this.control;
    const v = getOwn(tc._value);
    const iv = getOwn(tc._initialValue);
    const child = this.makeChild(
      p,
      v,
      iv,
      tc._flags & (ControlFlags.Disabled | ControlFlags.Touched),
    );
    child.updateParentLink(this.control, p);
    return (this._fields[p] = child);

    function getOwn(v: any): unknown {
      if (v != null && Object.hasOwn(v, p)) {
        return v[p];
      }
      return undefined;
    }
  }

  ensureArray(): ControlLogic {
    throw new Error("This is an object control, not an array control.");
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
  valueChanged() {
    const ov = this.control._value as Record<string, unknown> | null;
    Object.entries(this._fields).forEach(([k, c]) => {
      const childValue = ov && Object.hasOwn(ov, k) ? ov[k] : undefined;
      c.setValueImpl(childValue, this.control);
    });
  }

  initialValueChanged() {
    const ov = this.control._initialValue as Record<string, unknown> | null;
    Object.entries(this._fields).forEach(([k, c]) => {
      const childValue = ov && Object.hasOwn(ov, k) ? ov[k] : undefined;
      c.setInitialValueImpl(childValue);
    });
  }

  childrenValid(): boolean {
    return Object.values(this._fields).every((c) => c.isValid());
  }

  setFields(fields: Record<string, InternalControl>) {
    this.withChildren((x) => x.updateParentLink(this.control, undefined));
    Object.entries(fields).forEach(([k, f]) =>
      f.updateParentLink(this.control, k),
    );
    this._fields = { ...fields };
    const v = this.copy(this.control._value);
    const iv = this.copy(this.control._initialValue);
    Object.entries(fields).forEach(([k, f]) => {
      v[k] = f.value;
      iv[k] = f.initialValue;
    });
    this.control.setValueAndInitial(v, iv);
  }
}
