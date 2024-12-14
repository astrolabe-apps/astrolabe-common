import { ObjectControl } from "./objectControl";
import { ArrayControl } from "./arrayControl";
import { Subscriptions } from "./subscriptions";
import {
  ChangeListenerFunc,
  Control,
  ControlChange,
  ControlProperties,
  ControlSetup,
  Subscription,
} from "./types";
import {
  ChildState,
  ControlFlags,
  InternalControl,
  ParentListener,
} from "./internal";
import { runTransaction } from "./transactions";

export let collectChange: ChangeListenerFunc<any> | undefined;

export function setChangeCollector(c: ChangeListenerFunc<any> | undefined) {
  collectChange = c;
}
interface ParentListeners {
  syncChildValueChange(
    v: unknown,
    ignore: InternalControl<unknown> | undefined,
  ): void;
  syncChildInitialValueChange(
    v: unknown,
    ignore: InternalControl<unknown> | undefined,
  ): void;
  childFlagChange(
    flags: ControlFlags,
    ignore: InternalControl<unknown> | undefined,
  ): void;
  updateChildLink(
    parent: InternalControl<unknown>,
    prop: string | number | undefined,
  ): ParentListeners | undefined;
}
export class ControlPropertiesImpl<V> implements ControlProperties<V> {
  public constructor(public _impl: ControlImpl<V>) {}

  get initialValue() {
    this._impl._flags &= ~ControlFlags.InitialValueMutating;
    return this._impl._initialValue;
  }

  get isNull() {
    return this._impl._value == null;
  }

  get touched() {
    return !!(this._impl._flags & ControlFlags.Touched);
  }

  set touched(touched: boolean) {
    this._impl.setTouched(touched);
  }

  get valid(): boolean {
    const i = this._impl;
    return !i._errors && (i._children?.allValid() ?? true);
  }

  get disabled() {
    return !!(this._impl._flags & ControlFlags.Disabled);
  }

  get dirty() {
    return this._impl.isDirty();
  }

  get value(): V {
    this._impl._flags &= ~ControlFlags.ValueMutating;
    return this._impl._value;
  }

  get elements(): Control<V extends Array<infer X> ? X : unknown>[] {
    return this._impl.getArrayChildren().getElements();
  }

  get fields() {
    return this._impl.getObjectChildren().getFields();
  }
  get error() {
    const errors = this._impl._errors;
    if (!errors) return null;
    return Object.values(errors)[0];
  }
}

let uniqueIdCounter = 0;
export class ControlImpl<V> implements InternalControl<V> {
  current: ControlPropertiesImpl<V>;
  public uniqueId: number;
  public meta: Record<string, any>;
  constructor(
    public _value: V,
    public _initialValue: V,
    public _flags: ControlFlags,
    public _setup?: ControlSetup<V, any>,
    public _parents?: ParentListeners,
    public _errors?: { [k: string]: string },
    public _children?: ChildState,
    public _subscriptions?: Subscriptions,
  ) {
    this.uniqueId = ++uniqueIdCounter;
    this.current = new ControlPropertiesImpl<V>(this);
    this.meta = _setup?.meta ?? {};
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

  get valid(): boolean {
    collectChange?.(this, ControlChange.Valid);
    return this.current.valid;
  }

  setValue(cb: (v: V) => V): void {
    this.setValueImpl(cb(this.current.value));
  }

  setParentAttach(
    parent: InternalControl<unknown>,
    prop: string | number | undefined,
  ): void {
    if (this._parents) {
      this._parents = this._parents.updateChildLink(parent, prop);
    } else if (prop != null) {
      this._parents = new SingleParent(parent._children!, prop);
    }
  }

  isEqual(v1: unknown, v2: unknown): boolean {
    return controlEquals(v1, v2, this._setup);
  }

  get error(): string | null | undefined {
    collectChange?.(this, ControlChange.Error);
    return this.current.error;
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

  newChild<V2>(
    value: V2,
    initialValue: V2,
    childProp: number | string,
    parent?: ParentListener,
  ): InternalControl<V2> {
    const setup = this._setup;
    const childSetup = setup
      ? typeof childProp === "string"
        ? (setup as ControlSetup<Record<string, V2>>).fields?.[childProp]
        : setup.elems
      : undefined;
    return new ControlImpl<V2>(
      value,
      initialValue,
      this._flags & ControlFlags.Disabled,
      childSetup as ControlSetup<V2>,
      parent ? new SingleParent(parent, childProp) : undefined,
    );
  }
  setValueImpl(v: V, fromParent?: InternalControl<unknown>): void {
    if (this.isEqual(this._value, v)) return;
    runTransaction(this, () => {
      const structureFlag =
        v == null || this._value == null
          ? ControlChange.Structure
          : ControlChange.None;
      this._value = v;
      const validator = this._setup?.validator;
      if (validator !== null) this.setError("default", validator?.(v));
      this._children?.updateChildValues();
      this._parents?.syncChildValueChange(v, fromParent);
      this._subscriptions?.applyChange(ControlChange.Value | structureFlag);
    });
  }

  setInitialValueImpl(v: V, fromParent?: InternalControl<unknown>): void {
    if (this.isEqual(this._initialValue, v)) return;
    runTransaction(this, () => {
      this._initialValue = v;
      this._children?.updateChildInitialValues();
      this._parents?.syncChildInitialValueChange(v, fromParent);
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
    return changeFlags;
  }

  get dirty() {
    collectChange?.(this, ControlChange.Dirty);
    return this.isDirty();
  }

  get elements() {
    collectChange?.(this, ControlChange.Structure);
    return this.getArrayChildren().getElements();
  }

  get fields() {
    return this.getObjectChildren().getFields();
  }

  getArrayChildren(): ArrayControl<V> {
    if (!this._children) {
      this._children = new ArrayControl<V>(this as InternalControl<unknown>);
    }
    return this._children as ArrayControl<V>;
  }

  getObjectChildren(): ObjectControl<V> {
    if (!this._children) {
      this._children = new ObjectControl<V>(this as InternalControl<unknown>);
    }
    return this._children as ObjectControl<V>;
  }

  subscribe(
    listener: ChangeListenerFunc<V>,
    mask: ControlChange,
  ): Subscription {
    this._subscriptions ??= new Subscriptions();
    const currentChanges = this.getChangeState(mask);
    return this._subscriptions.subscribe(listener, currentChanges, mask);
  }

  unsubscribe(subscription: ChangeListenerFunc<V> | Subscription) {
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

export class SingleParent implements ParentListeners {
  constructor(
    private parent: ParentListener,
    private child: string | number,
  ) {}

  updateChildLink(
    parent: InternalControl<unknown>,
    prop: string | number | undefined,
  ) {
    if (this.parent.control === parent) {
      if (prop == null) {
        return undefined;
      }
      this.child = prop;
    } else {
      throw new Error("Only single parent supported atm");
    }
    return this;
  }

  syncChildValueChange(
    v: unknown,
    ignore: InternalControl<unknown> | undefined,
  ): void {
    const c = this.parent.control;
    if (c === ignore) return;
    runTransaction(c, () => {
      this.parent.childValueChange(this.child, v);
    });
  }
  syncChildInitialValueChange(
    v: unknown,
    ignore: InternalControl<unknown>,
  ): void {
    const c = this.parent.control;
    if (c === ignore) return;
    runTransaction(c, () => {
      this.parent.childInitialValueChange(this.child, v);
    });
  }
  childFlagChange(
    flags: ControlFlags,
    ignore: InternalControl<unknown> | undefined,
  ): void {
    if (this.parent.control === ignore) return;
    this.parent.childFlagChange(this.child, flags);
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

export function trackControlChange(c: Control<any>, change: ControlChange) {
  collectChange?.(c, change);
}

export function newControl<V>(
  value: V,
  setup?: ControlSetup<V, any>,
  initialValue?: V,
): Control<V> {
  const c = new ControlImpl(value, value, ControlFlags.None, setup);
  if (arguments.length == 3) c.initialValue = initialValue!;
  return c;
}
