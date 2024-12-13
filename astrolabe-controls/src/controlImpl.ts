import { ObjectControl } from "./objectControl";
import { ArrayControl } from "./arrayControl";
import { Subscriptions, SubscriptionList } from "./subscriptions";

type ChangeListener = [ControlChange, ChangeListenerFunc<any>];

export type ChangeListenerFunc<V> = (
  control: Control<V>,
  cb: ControlChange,
) => void;

export type Subscription = {
  list: SubscriptionList;
  mask: ControlChange;
  listener: ChangeListenerFunc<any>;
};

export enum ControlFlags {
  None = 0,
  Invalid = 1,
  Touched = 2,
  Dirty = 4,
  Disabled = 8,
  CheckValid = 16,
  StructureChanged = 32,
  NeedsValidate = 64,
  ValueMutating = 128,
  InitialValueMutating = 256,
}

export enum ControlChange {
  None = 0,
  Valid = 1,
  Touched = 2,
  Dirty = 4,
  Disabled = 8,
  Value = 16,
  InitialValue = 32,
  Error = 64,
  All = Value | Valid | Touched | Disabled | Error | Dirty | InitialValue,
  Structure = 128,
  Validate = 256,
}

let transactionCount = 0;
let runListenerList: ControlImpl<any>[] = [];
let subscriptionListener: ChangeListenerFunc<any> | undefined;

interface ParentListeners {
  syncChildValueChange(
    v: unknown,
    ignore: ControlImpl<unknown> | undefined,
  ): void;
  syncChildInitialValueChange(
    v: unknown,
    ignore: ControlImpl<unknown> | undefined,
  ): void;
  childFlagChange(
    flags: ControlFlags,
    ignore: ControlImpl<unknown> | undefined,
  ): void;
  updateChildLink(
    parent: ControlImpl<unknown>,
    prop: string | number | undefined,
  ): ParentListeners | undefined;
}

export interface ParentListener {
  control: ControlImpl<unknown>;
  childValueChange(prop: string | number, v: unknown): void;
  childInitialValueChange(prop: string | number, v: unknown): void;
  childFlagChange(prop: string | number, flags: ControlFlags): void;
}

export interface ChildState extends ParentListener {
  updateChildValues(): void;
  updateChildInitialValues(): void;
}

export interface ControlSetup<V> {
  isEqual?: (v1: unknown, v2: unknown) => boolean;
  fields?: { [K in keyof V]?: ControlSetup<V[K]> };
  elem?: V extends Array<infer X> ? ControlSetup<X> : never;
}

export interface ControlProperties<V> {
  value: V;
  initialValue: V;
  // error: string | null | undefined;
  // readonly errors: { [k: string]: string };
  // readonly valid: boolean;
  readonly dirty: boolean;
  // disabled: boolean;
  // touched: boolean;
  readonly fields: {
    [K in keyof NonNullable<V>]-?: Control<NonNullable<V>[K]>;
  };
  readonly elements: Control<V extends Array<infer X> ? X : unknown>[];
  readonly isNull: boolean;
}

export interface Control<V> extends ControlProperties<V> {
  subscribe(listener: ChangeListenerFunc<V>, mask: ControlChange): Subscription;
  unsubscribe(subscription: Subscription): void;
  isEqual: (v1: unknown, v2: unknown) => boolean;
  current: ControlProperties<V>;
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
}

let uniqueIdCounter = 0;
export class ControlImpl<V> implements Control<V> {
  current: ControlPropertiesImpl<V>;
  public uniqueId: number;
  constructor(
    public _value: V,
    public _initialValue: V,
    public _flags: ControlFlags,
    public _parents?: ParentListeners,
    public _errors?: { [k: string]: string },
    public _children?: ChildState,
    public _subscriptions?: Subscriptions,
    public _setup?: ControlSetup<V>,
  ) {
    this.uniqueId = ++uniqueIdCounter;
    this.current = new ControlPropertiesImpl<V>(this);
  }

  setParentAttach(
    parent: ControlImpl<unknown>,
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

  get isNull() {
    subscriptionListener?.(this, ControlChange.Structure);
    return this._value == null;
  }

  get value(): V {
    subscriptionListener?.(this, ControlChange.Value);
    return this.current.value;
  }

  get initialValue(): V {
    subscriptionListener?.(this, ControlChange.InitialValue);
    return this.current.initialValue;
  }

  set value(v: V) {
    this.setValueImpl(v);
  }

  set initialValue(v: V) {
    this.setInitialValueImpl(v);
  }

  setValueImpl(v: V, fromParent?: ControlImpl<unknown>): boolean {
    if (this.isEqual(this._value, v)) return false;
    return runTransaction(this, () => {
      const structureFlag =
        v == null || this._value == null
          ? ControlChange.Structure
          : ControlChange.None;
      this._value = v;
      this._children?.updateChildValues();
      this._parents?.syncChildValueChange(v, fromParent);
      this._subscriptions?.applyChange(ControlChange.Value | structureFlag);
      return true;
    });
  }

  setInitialValueImpl(v: V, fromParent?: ControlImpl<unknown>): boolean {
    if (this.isEqual(this._initialValue, v)) return false;
    return runTransaction(this, () => {
      this._initialValue = v;
      this._children?.updateChildInitialValues();
      this._parents?.syncChildInitialValueChange(v, fromParent);
      this._subscriptions?.applyChange(ControlChange.InitialValue);
      return true;
    });
  }

  isDirty() {
    return !this.isEqual(this._value, this._initialValue);
  }

  getChangeState(mask: ControlChange): ControlChange {
    let changeFlags = ControlChange.None;
    if (mask & ControlChange.Dirty && this.isDirty())
      changeFlags |= ControlChange.Dirty;
    return changeFlags;
  }

  get dirty() {
    subscriptionListener?.(this, ControlChange.Dirty);
    return this.isDirty();
  }

  get elements() {
    subscriptionListener?.(this, ControlChange.Structure);
    return this.getArrayChildren().getElements();
  }

  get fields() {
    return this.getObjectChildren().getFields();
  }

  getArrayChildren(): ArrayControl<V> {
    if (!this._children) {
      this._children = new ArrayControl<V>(this);
    }
    return this._children as ArrayControl<V>;
  }

  getObjectChildren(): ObjectControl<V> {
    if (!this._children) {
      this._children = new ObjectControl<V>(this);
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

  unsubscribe(subscription: Subscription) {
    this._subscriptions?.unsubscribe(subscription);
  }

  runListeners() {
    const s = this._subscriptions;
    if (s) {
      const currentChanges = this.getChangeState(s.mask);
      s.runListeners(this, currentChanges);
    }
  }
}

export function groupedChanges<A>(run: () => A): A {
  transactionCount++;
  try {
    return run();
  } finally {
    commit(undefined);
  }
}
function runTransaction(
  control: ControlImpl<unknown>,
  run: () => boolean,
): boolean {
  transactionCount++;
  let shouldRunListeners;
  try {
    shouldRunListeners = run();
  } catch (e) {
    console.error("Error in control", e);
    shouldRunListeners = false;
  }
  commit(shouldRunListeners ? control : undefined);
  return shouldRunListeners;
}

function commit(control?: ControlImpl<unknown>) {
  const sub = control?._subscriptions;
  if (transactionCount > 1) {
    if (sub) {
      sub.onListenerList = true;
      runListenerList.push(control);
    }
  } else {
    if (!runListenerList.length && sub) {
      control!.runListeners();
    } else {
      if (sub) runListenerList.push(control);
      while (runListenerList.length > 0) {
        const listenersToRun = runListenerList;
        runListenerList = [];
        listenersToRun.forEach(
          (c) => (c._subscriptions!.onListenerList = false),
        );
        listenersToRun.forEach((c) => c.runListeners());
      }
    }
  }
  transactionCount--;
}

export class SingleParent implements ParentListeners {
  constructor(
    private parent: ParentListener,
    private child: string | number,
  ) {}

  updateChildLink(
    parent: ControlImpl<unknown>,
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
    ignore: ControlImpl<unknown> | undefined,
  ): void {
    const c = this.parent.control;
    if (c === ignore) return;
    runTransaction(c, () => {
      this.parent.childValueChange(this.child, v);
      return true;
    });
  }
  syncChildInitialValueChange(v: unknown, ignore: ControlImpl<unknown>): void {
    const c = this.parent.control;
    if (c === ignore) return;
    runTransaction(c, () => {
      this.parent.childInitialValueChange(this.child, v);
      return true;
    });
  }
  childFlagChange(
    flags: ControlFlags,
    ignore: ControlImpl<unknown> | undefined,
  ): void {
    if (this.parent.control === ignore) return;
    this.parent.childFlagChange(this.child, flags);
  }
}

export function newControl<V>(v: V): Control<V> {
  return new ControlImpl(v, v, ControlFlags.None, undefined);
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
      const elemSetup = setup?.elem;
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

export function updateElements<V>(
  control: Control<V[] | null | undefined>,
  cb: (elems: Control<V>[]) => Control<V>[],
): void {
  const c = control as ControlImpl<V[]>;
  const arrayChildren = c.getArrayChildren();
  const oldElems = arrayChildren.getElements();
  const newElems = cb(oldElems);
  if (
    oldElems === newElems ||
    (oldElems.length === newElems.length &&
      oldElems.every((x, i) => x === newElems[i]))
  )
    return;

  const iv = c._initialValue ?? [];
  runTransaction(c, () => {
    newElems.forEach((x, i) => {
      const xc = x as ControlImpl<V>;
      xc.setInitialValueImpl(iv[i], c);
      xc.setParentAttach(c, i);
    });
    if (newElems.length < oldElems.length) {
      oldElems
        .slice(newElems.length)
        .forEach((x) => x.setParentAttach(c, undefined));
    }
    arrayChildren._elems = newElems as unknown as ControlImpl<unknown>[];
    c.setValueImpl(newElems.map((x) => x.current.value));
    c._subscriptions?.applyChange(ControlChange.Structure);
    return true;
  });
}
