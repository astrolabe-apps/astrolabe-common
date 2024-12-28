import { Subscriptions } from "./subscriptions";
import {
  ChangeListenerFunc,
  Control,
  ControlChange,
  ControlElements,
  ControlFields,
  ControlProperties,
  ControlSetup,
  ControlValue,
  Subscription,
} from "./types";
import { ControlFlags, ControlLogic, InternalControl } from "./internal";
import { groupedChanges, runTransaction } from "./transactions";
import { ObjectLogic } from "./objectControl";
import { ArrayLogic } from "./arrayControl";

export let collectChange: ChangeListenerFunc<any> | undefined;

export function setChangeCollector(c: ChangeListenerFunc<any> | undefined) {
  collectChange = c;
}

let uniqueIdCounter = 0;

export const FieldsProxy: ProxyHandler<InternalControl> = {
  get(target: InternalControl, p: string | symbol, receiver: any): any {
    if (typeof p !== "string") return undefined;
    return target.getField(p);
  },
};

export class ControlImpl<V> implements InternalControl<V> {
  public uniqueId: number;
  public meta: Record<string, any> = {};

  constructor(
    public _value: V,
    public _initialValue: V,
    public _flags: ControlFlags,
    public _logic: ControlLogic,
    public _errors?: { [k: string]: string },
    public _subscriptions?: Subscriptions,
  ) {
    this.uniqueId = ++uniqueIdCounter;
    _logic.attach(this);
  }

  validate(): boolean {
    this._logic.withChildren((x) => x.validate());
    this._subscriptions?.runMatchingListeners(this, ControlChange.Validate);
    return this.valid;
  }

  get fields(): ControlFields<V> & {} {
    return new Proxy<any>(this, FieldsProxy);
  }

  get elements(): ControlElements<V> {
    collectChange?.(this, ControlChange.Structure);
    return this.current.elements;
  }

  get current(): ControlProperties<V> {
    return new ControlPropertiesImpl(this);
  }

  getField(p: string): InternalControl {
    return this._logic.getField(p);
  }

  get touched() {
    collectChange?.(this, ControlChange.Touched);
    return !!(this._flags & ControlFlags.Touched);
  }

  set touched(touched: boolean) {
    this.setTouched(touched);
  }

  setTouched(touched: boolean, notChildren?: boolean) {
    runTransaction(this, () => {
      if (touched) {
        this._flags |= ControlFlags.Touched;
      } else {
        this._flags &= ~ControlFlags.Touched;
      }
      if (!notChildren) this._logic.withChildren((x) => x.setTouched(touched));
    });
  }

  get disabled() {
    collectChange?.(this, ControlChange.Disabled);
    return !!(this._flags & ControlFlags.Disabled);
  }

  set disabled(b: boolean) {
    this.setDisabled(b);
  }
  setDisabled(disabled: boolean, notChildren?: boolean) {
    runTransaction(this, () => {
      if (disabled) {
        this._flags |= ControlFlags.Disabled;
      } else {
        this._flags &= ~ControlFlags.Disabled;
      }
      if (!notChildren)
        this._logic.withChildren((x) => x.setDisabled(disabled));
    });
  }

  get valid(): boolean {
    collectChange?.(this, ControlChange.Valid);
    return this.isValid();
  }

  setValue(cb: (v: V) => V): void {
    this.setValueImpl(cb(this.current.value));
  }

  setValueAndInitial(v: V, iv: V) {
    groupedChanges(() => {
      this.value = v;
      this.initialValue = iv;
    });
  }

  isEqual(v1: unknown, v2: unknown): boolean {
    return this._logic.isEqual(v1, v2);
  }

  get error(): string | null | undefined {
    collectChange?.(this, ControlChange.Error);
    return this.current.error;
  }

  set error(error: string | null | undefined) {
    this.setError("default", error);
  }

  get errors() {
    collectChange?.(this, ControlChange.Error);
    return this.current.errors;
  }

  get isNull() {
    collectChange?.(this, ControlChange.Structure);
    return this._value == null;
  }

  get value(): V {
    collectChange?.(this, ControlChange.Value);
    return this.current.value;
  }

  get initialValue(): V {
    collectChange?.(this, ControlChange.InitialValue);
    return this.current.initialValue;
  }

  set value(v: V) {
    this.setValueImpl(v);
  }

  set initialValue(v: V) {
    this.setInitialValueImpl(v);
  }

  clearErrors() {
    this.setErrors(null);
  }

  setValueImpl(v: V, from?: InternalControl): void {
    if (this._logic.isEqual(this._value, v)) return;
    runTransaction(this, () => {
      const structureFlag =
        v == null || this._value == null
          ? ControlChange.Structure
          : ControlChange.None;
      this._value = v;
      if (!(this._flags & ControlFlags.DontClearError)) {
        this.setErrors(null);
      }
      this._logic.valueChanged(from);
      this._subscriptions?.applyChange(ControlChange.Value | structureFlag);
    });
  }

  setInitialValueImpl(v: V, fromParent?: InternalControl): void {
    if (this._logic.isEqual(this._initialValue, v)) return;
    runTransaction(this, () => {
      this._initialValue = v;
      this._logic.initialValueChanged();
      this._subscriptions?.applyChange(ControlChange.InitialValue);
    });
  }

  isDirty() {
    return !this._logic.isEqual(this._value, this._initialValue);
  }

  isValid() {
    if (this._errors != null || this._flags & ControlFlags.ChildInvalid)
      return false;
    const allChildrenValid = this._logic.childrenValid();
    if (!allChildrenValid) this._flags |= ControlFlags.ChildInvalid;
    return allChildrenValid;
  }

  getChangeState(mask: ControlChange): ControlChange {
    const c = this.current;
    let changeFlags = ControlChange.None;
    if (mask & ControlChange.Dirty && this.isDirty())
      changeFlags |= ControlChange.Dirty;
    if (mask & ControlChange.Valid && this.isValid())
      changeFlags |= ControlChange.Valid;
    if (mask & ControlChange.Disabled && c.disabled)
      changeFlags |= ControlChange.Disabled;
    if (mask & ControlChange.Touched && c.touched)
      changeFlags |= ControlChange.Touched;
    return changeFlags;
  }

  markAsClean() {
    this.setInitialValueImpl(this.current.value);
  }

  get dirty() {
    collectChange?.(this, ControlChange.Dirty);
    return this.isDirty();
  }

  subscribe(
    listener: ChangeListenerFunc<V>,
    mask: ControlChange,
  ): Subscription {
    this._subscriptions ??= new Subscriptions();
    const currentChanges = this.getChangeState(mask);
    return this._subscriptions.subscribe(listener, currentChanges, mask);
  }

  unsubscribe(subscription: Subscription) {
    this._subscriptions?.unsubscribe(subscription);
  }

  setError(key: string, error?: string | null) {
    runTransaction(this, () => {
      const hadErrors = this._errors != null;
      const exE = this._errors;
      if (!error) error = null;
      if (exE?.[key] != error) {
        if (error) {
          if (exE) exE[key] = error;
          else this._errors = { [key]: error };
        } else {
          if (exE) {
            if (Object.values(exE).length === 1) this._errors = undefined;
            else delete exE[key];
          }
        }
      }
      const hasErrors = this._errors != null;
      if (hadErrors != hasErrors) this._logic.validityChanged(hasErrors);
      this._subscriptions?.applyChange(ControlChange.Error);
    });
  }

  setErrors(errors?: { [p: string]: string | null | undefined } | null) {
    if (this._errors == null && errors == null) return;
    runTransaction(this, () => {
      const realErrors = Object.entries(errors ?? {}).filter((x) => !!x[1]);
      const exactErrors = realErrors.length
        ? (Object.fromEntries(realErrors) as Record<string, string>)
        : undefined;
      if (!deepEquals(exactErrors, this._errors)) {
        this._errors = exactErrors;
        this._subscriptions?.applyChange(ControlChange.Error);
      }
    });
  }

  runListeners() {
    const s = this._subscriptions;
    if (s) {
      const currentChanges = this.getChangeState(s.mask);
      s.runListeners(this, currentChanges);
    }
  }

  set element(v: any) {
    this.meta.element = v;
  }
  get element(): any {
    return this.meta.element;
  }
}

class ControlPropertiesImpl<V> implements ControlProperties<V> {
  constructor(private control: ControlImpl<V>) {}

  get value(): V {
    return this.control._value;
  }

  get isNull() {
    return this.control._value == null;
  }

  set value(v: V) {
    this.control.setValueImpl(v);
  }

  get initialValue(): V {
    return this.control._initialValue;
  }

  set initialValue(v: V) {
    this.control.setInitialValueImpl(v);
  }

  get error(): string | null | undefined {
    const e = this.control._errors;
    return e ? Object.values(e)[0] : null;
  }

  get errors(): { [k: string]: string } {
    return this.control._errors ?? {};
  }

  get valid(): boolean {
    return this.control.isValid();
  }

  get dirty(): boolean {
    return this.control.isDirty();
  }

  get disabled(): boolean {
    return !!(this.control._flags & ControlFlags.Disabled);
  }

  set disabled(b: boolean) {
    this.control.setDisabled(b);
  }

  get touched(): boolean {
    return !!(this.control._flags & ControlFlags.Touched);
  }

  set touched(touched: boolean) {
    this.control.setTouched(touched);
  }

  get fields() {
    return this.control.fields;
  }

  get elements(): ControlElements<V> {
    return this.control._logic.getElements() as ControlElements<V>;
  }
}

export function deepEquals(
  a: any,
  b: any,
  childEquals: (field?: string) => (a: any, b: any) => boolean = () =>
    deepEquals,
): boolean {
  if (a === b) return true;
  if (a == null) return a === b;
  if (b == null) return false;
  if (typeof a == "object" && typeof b == "object") {
    if (a.constructor !== b.constructor) return false;
    let length, i, keys;
    if (Array.isArray(a)) {
      if (a.length != b.length) return false;
      return a.every((x, i) => childEquals()(x, b[i]));
    }
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    return keys.every((k) => childEquals(k)(a[k], b[k]));
  }
  return a !== a && b !== b;
}

export function equalityForSetup(
  setup?: ControlSetup<any>,
): (a: any, b: any) => boolean {
  if (!setup) return deepEquals;
  if (setup.equals) return setup.equals;
  if (setup.elems) {
    const arrayEqual = equalityForSetup(setup.elems);
    return (a, b) => deepEquals(a, b, () => arrayEqual);
  }
  const fieldsEqual: Record<string, (a: any, b: any) => boolean> = setup?.fields
    ? Object.fromEntries(
        Object.entries(setup.fields).map(([k, v]) => [k, equalityForSetup(v)]),
      )
    : {};
  return (a, b) =>
    deepEquals(a, b, (field) => fieldsEqual[field!] ?? deepEquals);
}

export function trackControlChange(c: Control<any>, change: ControlChange) {
  collectChange?.(c, change);
}

export function newControl<V>(
  value: V,
  setup?: ControlSetup<V, any>,
  initialValue?: V,
): Control<V> {
  return new ControlImpl<V>(
    value,
    arguments.length == 3 ? initialValue! : value,
    ControlFlags.None,
    setup ? new ConfiguredControlLogic(setup) : new DefaultControlLogic(),
  );
}

export function controlGroup<C extends { [k: string]: Control<unknown> }>(
  fields: C,
): Control<{ [K in keyof C]: ControlValue<C[K]> }> {
  const obj = new ObjectLogic(
    deepEquals,
    undefined,
    (f, v, iv, flags) =>
      new ControlImpl(v, iv, flags, new DefaultControlLogic()),
  );
  const newParent = new ControlImpl(
    undefined,
    undefined,
    ControlFlags.None,
    obj,
  );
  obj.setFields(fields as unknown as Record<string, InternalControl>);
  return newParent as unknown as Control<{
    [K in keyof C]: ControlValue<C[K]>;
  }>;
}

class DefaultControlLogic extends ControlLogic {
  constructor() {
    super(deepEquals);
  }
  withChildren(f: (c: InternalControl) => void): void {}
  getField(p: string): InternalControl {
    const objectLogic = new ObjectLogic(
      this.isEqual,
      this.parents,
      (p, v, iv, flags) =>
        new ControlImpl(v, iv, flags, new DefaultControlLogic()),
    );
    objectLogic.attach(this.control);
    return objectLogic.getField(p);
  }

  getElements(): InternalControl[] {
    const arrayLogic = new ArrayLogic(
      this.isEqual,
      this.parents,
      (v, iv, flags) =>
        new ControlImpl(v, iv, flags, new DefaultControlLogic()),
    );
    arrayLogic.attach(this.control);
    return arrayLogic.getElements();
  }
}

class ConfiguredControlLogic extends ControlLogic {
  withChildren(f: (c: InternalControl) => void): void {}
  constructor(private setup: ControlSetup<any>) {
    super(equalityForSetup(setup));
  }

  attach(c: InternalControl): void {
    super.attach(c);
    const v = this.setup.validator;
    if (v !== undefined) {
      const runValidation = () => c.setError("default", v?.(c.current.value));
      runValidation();
      c.subscribe(runValidation, ControlChange.Value | ControlChange.Validate);
      c._flags |= ControlFlags.DontClearError;
    }
    const f = this.setup.fields;
    if (f) {
      Object.entries(f).forEach(([k, v]) => {
        if (v?.validator !== undefined) this.getField(k);
      });
    } else if (this.setup.elems) {
      this.getElements();
    }
    if (this.setup.meta) c.meta = { ...this.setup.meta };
    this.setup.afterCreate?.(c);
  }

  getField(p: string): InternalControl {
    const objectLogic = new ObjectLogic(
      this.isEqual,
      this.parents,
      (p, v, iv, flags) => {
        const fieldSetup = this.setup.fields?.[p];
        return new ControlImpl(
          v,
          iv,
          flags,
          fieldSetup
            ? new ConfiguredControlLogic(fieldSetup)
            : new DefaultControlLogic(),
        );
      },
    );
    objectLogic.attach(this.control);
    return objectLogic.getField(p);
  }
  getElements(): InternalControl[] {
    const arrayLogic = new ArrayLogic(
      this.isEqual,
      this.parents,
      (v, iv, flags) => {
        const elemSetup = this.setup.elems;
        return new ControlImpl(
          v,
          iv,
          flags,
          elemSetup
            ? new ConfiguredControlLogic(elemSetup)
            : new DefaultControlLogic(),
        );
      },
    );
    arrayLogic.attach(this.control);
    return arrayLogic.getElements();
  }
}
