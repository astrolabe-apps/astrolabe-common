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

interface ParentListener {
  control: ControlImpl<unknown>;
  childValueChange(prop: string | number, v: unknown): void;
  childInitialValueChange(prop: string | number, v: unknown): void;
  childFlagChange(prop: string | number, flags: ControlFlags): void;
}

interface ChildState extends ParentListener {
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
  readonly fields: { [K in keyof V]-?: Control<V[K]> };
  readonly elements: Control<V extends Array<infer X> ? X : unknown>[];
  // readonly isNull: boolean;
}

export interface Control<V> extends ControlProperties<V> {
  fields: { [K in keyof V]-?: Control<V[K]> };
  elements: Control<V extends Array<infer X> ? X : unknown>[];
  readonly dirty: boolean;
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

  get fields(): { [K in keyof V]-?: Control<V[K]> } {
    return this._impl.getObjectChildren().getFields();
  }
}

export class ControlImpl<V> implements Control<V> {
  current: ControlPropertiesImpl<V>;
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

  get value(): V {
    return this.current.value;
  }

  get initialValue(): V {
    return this.current.initialValue;
  }

  set value(v: V) {
    this.setValue(v);
  }

  set initialValue(v: V) {
    this.setInitialValue(v);
  }

  setValue(v: V, fromParent?: ControlImpl<unknown>): boolean {
    if (this.isEqual(this._value, v)) return false;
    return runTransaction(this, () => {
      this._value = v;
      this._children?.updateChildValues();
      this._parents?.syncChildValueChange(v, fromParent);
      this._subscriptions?.applyChange(ControlChange.Value);
      return true;
    });
  }

  setInitialValue(v: V, fromParent?: ControlImpl<unknown>): boolean {
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
    return this.isDirty();
  }

  get elements() {
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

class ArrayControl<V> implements ChildState {
  public _elems: ControlImpl<unknown>[];

  constructor(public control: ControlImpl<any>) {
    const v = (control._value ?? []) as any[];
    const iv = (control._initialValue ?? []) as any[];
    this._elems = v.map((x, i) => {
      return new ControlImpl(
        x,
        iv[i],
        control._flags & ControlFlags.Disabled,
        new SingleParent(this, i),
      );
    });
  }

  getElements(): ControlImpl<V extends Array<infer X> ? X : unknown>[] {
    return this._elems as any;
  }

  updateChildValues(): void {
    const c = this.control;
    const v = (c._value ?? []) as any[];
    const iv = (c._initialValue ?? []) as any[];
    const oldElems = this._elems;
    const newLength = v.length;
    this._elems = v.map((x, i) => {
      const old = oldElems[i];
      if (old) {
        old.setValue(x, c);
        old.setParentAttach(c, i);
        return old;
      }
      return new ControlImpl(
        x,
        iv[i],
        c._flags & ControlFlags.Disabled,
        new SingleParent(this, i),
      );
    });
    if (newLength < oldElems.length) {
      oldElems.slice(newLength).forEach((x) => x.setParentAttach(c, undefined));
    }
  }
  updateChildInitialValues(): void {
    throw new Error("Method not implemented.");
  }
  childValueChange(prop: string | number, v: unknown): void {
    let c = this.control;
    let curValue = c._value;
    if (!(c._flags & ControlFlags.ValueMutating)) {
      curValue = [...curValue];
      c._value = curValue;
      c._flags |= ControlFlags.ValueMutating;
    }
    (curValue as any)[prop] = v;
    c._subscriptions?.applyChange(ControlChange.Value);
  }
  childInitialValueChange(prop: string | number, v: unknown): void {
    let c = this.control;
    let curValue = c._value;
    if (!(c._flags & ControlFlags.InitialValueMutating)) {
      curValue = [...curValue];
      c._value = curValue;
      c._flags |= ControlFlags.InitialValueMutating;
    }
    (curValue as any)[prop] = v;
    c._subscriptions?.applyChange(ControlChange.InitialValue);
  }
  childFlagChange(prop: string | number, flags: ControlFlags): void {
    throw new Error("Method not implemented.");
  }
}

class ObjectControl<V> implements ChildState {
  private _fields: Record<string, ControlImpl<unknown>> = {};
  constructor(public control: ControlImpl<any>) {}
  updateChildValues(): void {
    const c = this.control;
    const v = c._value;
    Object.entries(this._fields).forEach(([k, fv]) => {
      const cv = (v as any)[k];
      fv.setValue(cv, c);
    });
  }

  updateChildInitialValues(): void {
    const c = this.control;
    const v = c._value;
    Object.entries(this._fields).forEach(([k, fv]) => {
      const cv = (v as any)[k];
      fv.setInitialValue(cv, c);
    });
  }

  getFields(): { [K in keyof V]-?: Control<V[K]> } {
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
    if (!(c._flags & ControlFlags.ValueMutating)) {
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
    if (!(c._flags & ControlFlags.InitialValueMutating)) {
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
    }
    while (runListenerList.length > 0) {
      const listenersToRun = runListenerList;
      runListenerList = [];
      listenersToRun.forEach((c) => (c._subscriptions!.onListenerList = false));
      listenersToRun.forEach((c) => c.runListeners());
    }
  }
  transactionCount--;
}

const FieldsProxy: ProxyHandler<ObjectControl<unknown>> = {
  get(target: ObjectControl<unknown>, p: string | symbol, receiver: any): any {
    if (typeof p !== "string") return undefined;
    return target.getField(p);
  },
};

class SingleParent implements ParentListeners {
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

class Subscriptions {
  private lists: SubscriptionList[] = [];
  public mask: ControlChange = ControlChange.None;
  public onListenerList = false;
  subscribe<V>(
    listener: ChangeListenerFunc<V>,
    current: ControlChange,
    mask: ControlChange,
  ): Subscription {
    let list = this.lists.find((x) => x.canBeAdded(current, mask));
    if (!list) {
      list = new SubscriptionList(current, mask);
      this.lists.push(list);
    }
    this.mask |= mask;
    return list.add(listener, mask);
  }

  unsubscribe(sub: Subscription): void {
    sub.list.remove(sub);
  }

  runListeners(control: Control<any>, current: ControlChange) {
    this.lists.forEach((s) => s.runListeners(control, current));
  }

  applyChange(change: ControlChange) {
    this.lists.forEach((x) => x.applyChange(change));
  }
}

class SubscriptionList {
  private subscriptions: Subscription[] = [];

  constructor(
    private changeState: ControlChange,
    private mask: ControlChange,
  ) {}

  remove(sub: Subscription) {
    this.subscriptions = this.subscriptions.filter((x) => x !== sub);
  }

  runListeners(control: Control<any>, current: ControlChange) {
    const nextCurrent = current & this.mask;
    const actualChange = (nextCurrent ^ this.changeState) as ControlChange;
    this.changeState = nextCurrent;
    if (actualChange) {
      this.subscriptions.forEach((s) => {
        const change = s.mask & actualChange;
        if (change) s.listener(control, change);
      });
    }
  }

  applyChange(change: ControlChange) {
    this.changeState |= change & this.mask;
  }
  add<V>(listener: ChangeListenerFunc<V>, mask: ControlChange): Subscription {
    const sub: Subscription = {
      list: this,
      mask,
      listener: listener as ChangeListenerFunc<any>,
    };
    this.mask |= mask;
    this.subscriptions.push(sub);
    return sub;
  }

  canBeAdded(current: ControlChange, mask: ControlChange): boolean {
    return (this.changeState & mask) === current;
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
      xc.setInitialValue(iv[i], c);
      xc.setParentAttach(c, i);
    });
    if (newElems.length < oldElems.length) {
      oldElems
        .slice(newElems.length)
        .forEach((x) => x.setParentAttach(c, undefined));
    }
    arrayChildren._elems = newElems as unknown as ControlImpl<unknown>[];
    c.setValue(newElems.map((x) => x.current.value));
    return true;
  });
}
