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
import { ControlFlags, ControlStorage, InternalControl } from "./internal";
import { runTransaction } from "./transactions";

export let collectChange: ChangeListenerFunc<any> | undefined;

export function setChangeCollector(c: ChangeListenerFunc<any> | undefined) {
  collectChange = c;
}
export class ControlPropertiesImpl<V> implements ControlProperties<V> {
  public constructor(public _impl: ControlImpl<V>) {}

  get isNull(): boolean {
    throw new Error("Not implemented");
    // return this._impl._value == null;
  }

  get touched() {
    throw new Error("Not implemented");
    // return !!(this._impl._flags & ControlFlags.Touched);
  }

  set touched(touched: boolean) {
    this._impl.setTouched(touched);
  }

  get valid(): boolean {
    throw new Error("Not implemented");
    // const i = this._impl;
    // if (i._errors) return false;
    // if (i._children) return i._children.allValid();
    // // check validation for all child fields
    // if (i._setup?.fields) {
    //   return Object.entries(i._setup.fields).every(([k, v]) => {
    //     const val = (i._value as any)[k];
    //     return !(v as any).validator?.(val);
    //   });
    // }
    // // check validation for all array elements
    // const elemValidator = i._setup?.elems?.validator;
    // if (elemValidator) {
    //   return (i._value as any[]).every((x) => elemValidator(x));
    // }
    // return true;
  }

  get disabled() {
    throw new Error("Not implemented");

    // return !!(this._impl._flags & ControlFlags.Disabled);
  }

  set disabled(disabled: boolean) {
    this._impl.setDisabled(disabled);
  }

  get dirty() {
    return this._impl.isDirty();
  }

  get value(): V {
    return this._impl.getValue();
  }

  get initialValue(): V {
    return this._impl.getInitialValue();
  }

  get elements(): Control<V extends Array<infer X> ? X : unknown>[] {
    throw new Error("Not implemented");
    // return this._impl.getArrayChildren().getElements();
  }

  get fields(): ControlFields<NonNullable<V>> {
    throw new Error("Not implemented");
    // return this._impl.getObjectChildren().getFields();
  }
  get error() {
    const errors = this._impl._errors;
    if (!errors) return null;
    return Object.values(errors)[0];
  }

  get errors() {
    return this._impl._errors ?? {};
  }
}

let uniqueIdCounter = 0;
export class ControlImpl<V> implements InternalControl<V> {
  current: ControlPropertiesImpl<V>;
  uniqueId: number;
  meta: Record<string, any> = {};
  constructor(
    public isEqual: (a: unknown, b: unknown) => boolean,
    public _storage: ControlStorage,
    public _flags: ControlFlags,
    public _storageKey: string | number | undefined,
    public _errors?: { [k: string]: string },
    public _subscriptions?: Subscriptions,
  ) {
    this.uniqueId = ++uniqueIdCounter;
    this.current = new ControlPropertiesImpl<V>(this);
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
      if (touched) this._flags |= ControlFlags.Touched;
      else this._flags &= ~ControlFlags.Touched;
      if (!notChildren)
        this._storage.visitChildren((c) => {
          c.setTouched(touched);
          return true;
        });
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
      if (disabled) this._flags |= ControlFlags.Disabled;
      else this._flags &= ~ControlFlags.Disabled;
      if (!notChildren)
        this._storage.visitChildren((c) => {
          c.setDisabled(disabled);
          return true;
        });
    });
  }

  get valid(): boolean {
    collectChange?.(this, ControlChange.Valid);
    return this.current.valid;
  }

  setValue(cb: (v: V) => V): void {
    this.value = cb(this.current.value);
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

  get isNull(): boolean {
    collectChange?.(this, ControlChange.Structure);
    return this._storage.isNull(this);
  }

  get value(): V {
    collectChange?.(this, ControlChange.Value);
    return this.getValue();
  }

  getValue(): V {
    return this._storage.getValue(this) as V;
  }

  getInitialValue(): V {
    return this._storage.getInitialValue(this) as V;
  }
  get initialValue(): V {
    collectChange?.(this, ControlChange.InitialValue);
    return this.current.initialValue;
  }

  set value(v: V) {
    if (this.isEqual(this._storage.getValue(this), v)) return;
    this._storage.setValue(this, v);
  }

  set initialValue(v: V) {
    if (this.isEqual(this._storage.getInitialValue(this), v)) return;
    this._storage.setInitialValue(this, v);
  }

  clearErrors() {
    this.setErrors({});
  }

  // applyValueChange(
  //   v: V,
  //   updateChildren: boolean,
  //   fromParent?: InternalControl<unknown>,
  // ): void {
  //   const structureFlag =
  //     v == null || this._value == null
  //       ? ControlChange.Structure
  //       : ControlChange.None;
  //   this._value = v;
  //   const validator = this._setup?.validator;
  //   if (validator !== null) this.setError("default", validator?.(v));
  //   if (updateChildren) {
  //     this._children?.updateChildValues();
  //   }
  //   this._parents?.syncChildValueChange(v, fromParent);
  //   this._subscriptions?.applyChange(ControlChange.Value | structureFlag);
  // }

  // setValueImpl(v: V, fromParent?: InternalControl<unknown>): void {
  //   if (this.isEqual(this._storage.getValue(this) as V, v)) return;
  //   runTransaction(this, () => {
  //     this._storage.setValue(v, this);
  //   });
  // }
  //
  // setInitialValueImpl(v: V, fromParent?: InternalControl<unknown>): void {
  //   if (this.isEqual(this._storage.getInitialValue(this), v)) return;
  //   runTransaction(this, () => {
  //     this._initialValue = v;
  //     this._children?.updateChildInitialValues();
  //     this._subscriptions?.applyChange(ControlChange.InitialValue);
  //   });
  // }

  isDirty(): boolean {
    return !this.isEqual(
      this._storage.getValue(this) as V,
      this._storage.getInitialValue(this) as V,
    );
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
    this.initialValue = this.current.value;
  }

  get dirty() {
    collectChange?.(this, ControlChange.Dirty);
    return this.isDirty();
  }

  get elements(): Control<ControlElement<NonNullable<V>>>[] {
    collectChange?.(this, ControlChange.Structure);
    return this._storage.getElements(this) as any;
  }

  get fields(): ControlFields<NonNullable<V>> {
    const c = this as InternalControl<unknown>;
    return new Proxy(this._storage, {
      get(target: ControlStorage, p: string | symbol, receiver: any): any {
        return target.getField(c, p as string);
      },
    }) as unknown as ControlFields<NonNullable<V>>;
  }

  // getArrayChildren(): ArrayControl<V> {
  //   if (!this._children) {
  //     this._children = new ArrayControl<V>(this as InternalControl<unknown>);
  //   }
  //   return this._children as ArrayControl<V>;
  // }
  //
  // getObjectChildren(): ObjectControl<V> {
  //   if (!this._children) {
  //     this._children = new ObjectControl<V>(this as InternalControl<unknown>);
  //   }
  //   return this._children as ObjectControl<V>;
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
      if (!controlEquals(exactErrors, this._errors)) {
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

export function controlEquals(
  a: any,
  b: any,
  setup?: ControlSetup<any>,
): boolean {
  if (a === b) return true;
  if (setup?.isEqual) return setup.isEqual(a, b);
  if (a == null) return a === b;
  if (b == null) return false;
  if (typeof a == "object" && typeof b == "object") {
    if (a.constructor !== b.constructor) return false;
    let length, i, keys;
    if (Array.isArray(a)) {
      const elemSetup = setup?.elems;
      if (a.length != b.length) return false;
      return a.every((x, i) => controlEquals(x, b[i], elemSetup));
    }
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    return keys.every((k) => controlEquals(a[k], b[k], setup?.fields?.[k]));
  }
  return a !== a && b !== b;
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
  return new ControlImpl(
    equalityForSetup(setup),
    new BasicStorage(value, arguments.length == 3 ? initialValue : value),
    ControlFlags.None,
    undefined,
  );
}

class BasicStorage implements ControlStorage {
  _fields?: Record<string, InternalControl<unknown>>;
  constructor(
    public _value: unknown,
    public _initialValue: unknown,
  ) {}

  visitChildren(op: (c: InternalControl<unknown>) => boolean): boolean {
    throw new Error("Method not implemented.");
  }

  getElements(c: InternalControl<unknown>): InternalControl<unknown>[] {
    throw new Error("Method not implemented.");
  }
  getField(
    c: InternalControl<unknown>,
    field: string,
  ): InternalControl<unknown> {
    const f = (this._fields ??= {});
    if (c._storageKey == null) {
      const child = f[field];
      if (child) return child;
      const newChild = new ControlImpl(doEqual, this, ControlFlags.None, field);
      f[field] = newChild;
      return newChild;
    }
    throw new Error("getField");
  }
  setValue(c: InternalControl<unknown>, v: unknown): void {
    runTransaction(c, () => {
      c._subscriptions?.applyChange(ControlChange.Value);
      const sk = c._storageKey;
      if (sk == null) {
        this._value = v;
        return;
      }
      if (typeof sk === "string") {
        this._value = { ...(this._value as object), [sk]: v };
      } else {
        const ok = [...(this._value as unknown[])];
        ok[sk] = v;
        this._value = ok;
      }
    });
  }
  getValue(c: InternalControl<unknown>): unknown {
    const sk = c._storageKey;
    if (sk == null) return this._value;
    const cv = this._value;
    if (cv == null) return undefined;
    return (cv as Record<string | number, unknown>)[sk];
  }
  setInitialValue(c: InternalControl<unknown>, v: unknown): void {
    runTransaction(c, () => {
      c._subscriptions?.applyChange(ControlChange.InitialValue);
      const sk = c._storageKey;
      if (sk == null) {
        this._initialValue = v;
        return;
      }
      if (typeof sk === "string") {
        this._initialValue = { ...(this._initialValue as object), [sk]: v };
      } else {
        const ok = [...(this._initialValue as unknown[])];
        ok[sk] = v;
        this._initialValue = ok;
      }
    });
  }
  getInitialValue(c: InternalControl<unknown>): unknown {
    const sk = c._storageKey;
    if (sk == null) return this._initialValue;
    const cv = this._initialValue;
    if (cv == null) return undefined;
    return (cv as Record<string | number, unknown>)[sk];
  }
  isNull(c: InternalControl<unknown>): boolean {
    throw new Error("Method not implemented.");
  }
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
