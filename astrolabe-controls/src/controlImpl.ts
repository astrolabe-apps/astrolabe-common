import { Subscriptions } from "./subscriptions";
import {
  ChangeListenerFunc,
  Control,
  ControlChange,
  ControlElement,
  ControlFields,
  ControlProperties,
  ControlSetup,
  ControlValue,
  Subscription,
} from "./types";
import { ControlLogic, ControlFlags, InternalControl } from "./internal";
import { runTransaction } from "./transactions";
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

  get fields(): ControlFields<NonNullable<V>> {
    return new Proxy<any>(this, FieldsProxy);
  }

  get elements(): Control<ControlElement<NonNullable<V>>>[] {
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
      if (!notChildren)
        this._logic.withChildren((x) => this.setTouched(touched));
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
    return this.current.valid;
  }

  setValue(cb: (v: V) => V): void {
    this.setValueImpl(cb(this.current.value));
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
    this.setErrors({});
  }

  childValueChange(prop: string | number, v: unknown) {
    console.log(prop, v);
  }

  setValueImpl(v: V, from?: InternalControl): void {
    if (this._logic.isEqual(this._value, v)) return;
    runTransaction(this, () => {
      const structureFlag =
        v == null || this._value == null
          ? ControlChange.Structure
          : ControlChange.None;
      this._value = v;
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

  getChangeState(mask: ControlChange): ControlChange {
    const c = this.current;
    let changeFlags = ControlChange.None;
    if (mask & ControlChange.Dirty && c.dirty)
      changeFlags |= ControlChange.Dirty;
    if (mask & ControlChange.Valid && c.valid)
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
  error: string | null | undefined;

  get errors(): { [k: string]: string } {
    return this.control._errors ?? {};
  }

  get valid(): boolean {
    return true;
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

  get fields(): ControlFields<NonNullable<V>> {
    return this.control.fields;
  }

  get elements(): Control<ControlElement<NonNullable<V>>>[] {
    return this.control._logic.getElements() as unknown as Control<
      ControlElement<NonNullable<V>>
    >[];
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
  if (setup.isEqual) return setup.isEqual;
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
  throw new Error("Not implemented");
  // const v: Record<string, unknown> = {};
  // const iv: Record<string, unknown> = {};
  // Object.entries(fields).forEach(([k, f]) => {
  //   v[k] = f.value;
  //   iv[k] = f.initialValue;
  // });
  // const newParent = new ControlImpl(v, iv, ControlFlags.None);
  // Object.entries(fields).forEach(([k, f]) => {
  //   const ic = f as InternalControl<unknown>;
  //   ic.setParentAttach(newParent as InternalControl<unknown>, k);
  // });
  // newParent.getObjectChildren().setFields(fields);
  // return newParent as any;
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

  initialValueChanged() {}
}

class ConfiguredControlLogic extends ControlLogic {
  withChildren(f: (c: InternalControl) => void): void {}
  constructor(private setup: ControlSetup<any>) {
    super(equalityForSetup(setup));
  }
  getField(p: string): InternalControl {
    throw new Error("Method not implemented.");
  }
  getElements(): InternalControl[] {
    throw new Error("Method not implemented.");
  }
  initialValueChanged() {}
}
