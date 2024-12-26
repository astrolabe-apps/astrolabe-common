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
import { ChildState, ControlFlags, InternalControl } from "./internal";
import { runTransaction } from "./transactions";

export let collectChange: ChangeListenerFunc<any> | undefined;

export function setChangeCollector(c: ChangeListenerFunc<any> | undefined) {
  collectChange = c;
}

let uniqueIdCounter = 0;

export class ControlImpl<V> implements InternalControl<V> {
  public uniqueId: number;
  public meta: Record<string, any> = {};

  constructor(
    public _value: V,
    public _initialValue: V,
    public _flags: ControlFlags,
    public _children: ChildState,
    public _errors?: { [k: string]: string },
    public _subscriptions?: Subscriptions,
  ) {
    this.uniqueId = ++uniqueIdCounter;
  }

  fields!: ControlFields<NonNullable<V>>;
  elements!: Control<ControlElement<NonNullable<V>>>[];

  get current(): ControlProperties<V> {
    return this;
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
      if (!notChildren) this._children?.setTouched(touched);
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
      if (!notChildren) this._children?.setDisabled(disabled);
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
    return this._children.isEqual(v1, v2);
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

  applyValueChange(
    v: V,
    updateChildren: boolean,
    fromParent?: InternalControl<unknown>,
  ): void {
    const structureFlag =
      v == null || this._value == null
        ? ControlChange.Structure
        : ControlChange.None;
    this._value = v;
    // const validator = this._setup?.validator;
    // if (validator !== null) this.setError("default", validator?.(v));
    // if (updateChildren) {
    //   this._children?.updateChildValues();
    // }
    // this._parents?.syncChildValueChange(v, fromParent);
    this._subscriptions?.applyChange(ControlChange.Value | structureFlag);
  }

  setValueImpl(v: V, fromParent?: InternalControl<unknown>): void {
    if (this.isEqual(this._value, v)) return;
    runTransaction(this, () => {
      this.applyValueChange(v, true, fromParent);
    });
  }

  setInitialValueImpl(v: V, fromParent?: InternalControl): void {
    if (this.isEqual(this._initialValue, v)) return;
    runTransaction(this, () => {
      this._initialValue = v;
      this._children?.updateChildInitialValues();
      this._subscriptions?.applyChange(ControlChange.InitialValue);
    });
  }

  isDirty() {
    return !this.isEqual(this._value, this._initialValue);
  }

  getChangeState(mask: ControlChange): ControlChange {
    let changeFlags = ControlChange.None;
    if (mask & ControlChange.Dirty && this.isDirty())
      changeFlags |= ControlChange.Dirty;
    if (mask & ControlChange.Valid && this.current.valid)
      changeFlags |= ControlChange.Valid;
    if (mask & ControlChange.Disabled && this.current.disabled)
      changeFlags |= ControlChange.Disabled;
    if (mask & ControlChange.Touched && this.current.touched)
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

  // get elements() {
  //   collectChange?.(this, ControlChange.Structure);
  //   throw new Error("Not implemented");
  // }
  //
  // get fields() {
  //   throw new Error("Not implemented");
  // }

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

  setErrors(errors: { [p: string]: string | null | undefined }) {
    runTransaction(this, () => {
      const realErrors = Object.entries(errors).filter((x) => !!x[1]);
      const exactErrors = realErrors.length
        ? (Object.fromEntries(realErrors) as Record<string, string>)
        : undefined;
      if (!doEqual(exactErrors, this._errors)) {
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

function doEqual(
  a: any,
  b: any,
  childEquals: (field?: string) => (a: any, b: any) => boolean = () => doEqual,
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
  if (!setup) return doEqual;
  if (setup.isEqual) return setup.isEqual;
  if (setup.elems) {
    const arrayEqual = equalityForSetup(setup.elems);
    return (a, b) => doEqual(a, b, () => arrayEqual);
  }
  const fieldsEqual: Record<string, (a: any, b: any) => boolean> = setup?.fields
    ? Object.fromEntries(
        Object.entries(setup.fields).map(([k, v]) => [k, equalityForSetup(v)]),
      )
    : {};
  return (a, b) => doEqual(a, b, (field) => fieldsEqual[field!] ?? doEqual);
}

export function trackControlChange(c: Control<any>, change: ControlChange) {
  collectChange?.(c, change);
}

export function newControl<V>(
  value: V,
  setup?: ControlSetup<V, any>,
  initialValue?: V,
): Control<V> {
  const c = new ControlImpl(
    value,
    value,
    ControlFlags.None,
    equalityForSetup(setup),
  );
  if (arguments.length == 3) c.initialValue = initialValue!;
  return c;
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
