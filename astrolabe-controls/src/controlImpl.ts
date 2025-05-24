import { Subscriptions } from "./subscriptions";
import {
  ChangeListenerFunc,
  CleanupScope,
  CleanupScopeImpl,
  Control,
  ControlChange,
  ControlElements,
  ControlFields,
  ControlProperties,
  ControlSetup,
  ControlValue,
  DelayedSetup,
  Subscription,
  Value,
} from "./types";
import {
  ControlFlags,
  ControlLogic,
  InternalControl,
  ParentLink,
  ResolvedControlSetup,
} from "./internal";
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
    public parents?: ParentLink[],
    public _cleanup?: CleanupScopeImpl,
  ) {
    this.uniqueId = ++uniqueIdCounter;
    _logic.attach(this);
  }

  addCleanup(cleanup: () => void) {
    this._cleanup ??= createCleanupScope();
    this._cleanup.addCleanup(cleanup);
  }

  cleanup() {
    this._cleanup?.cleanup();
    this._logic.withChildren((c) =>
      c.parents?.length == 1 ? c.cleanup() : undefined,
    );
  }
  lookupControl(path: (string | number)[]): Control<any> | undefined {
    let base = this as Control<any> | undefined;
    let index = 0;
    while (index < path.length && base) {
      const childId = path[index];
      const c = base.current;
      if (typeof childId === "string") {
        base = c.fields[childId];
      } else {
        base = c.elements[childId];
      }
      index++;
    }
    return base;
  }

  updateParentLink(
    parent: InternalControl,
    key: string | number | undefined,
    initial?: boolean,
  ) {
    let pareList = this.parents;
    if (key == null) {
      if (pareList) this.parents = pareList.filter((p) => p.control !== parent);
      return;
    }
    const existing = pareList?.find((p) => p.control === parent);
    if (existing) {
      existing.key = key;
      if (initial) existing.origKey = key;
    } else {
      const newEntry = {
        control: parent,
        key,
        origKey: initial ? key : undefined,
      };
      if (!pareList) this.parents = [newEntry];
      else pareList.push(newEntry);
    }
  }

  valueChanged(from?: InternalControl) {
    this._logic.valueChanged();
    this.parents?.forEach((l) => {
      if (l.control !== from)
        l.control._logic.childValueChange(l.key, this._value);
    });
  }

  validityChanged(hasErrors: boolean) {
    this.parents?.forEach((l) => {
      const c = l.control;
      const alreadyInvalid = !!(c._flags & ControlFlags.ChildInvalid);
      if (!(hasErrors && alreadyInvalid)) {
        runTransaction(c, () => {
          if (hasErrors) c._flags |= ControlFlags.ChildInvalid;
          else {
            c._flags &= ~ControlFlags.ChildInvalid;
          }
        });
      }
      c.validityChanged(hasErrors);
    });
  }

  as<V2>(): V extends V2 ? Control<V2> : never {
    return this as any;
  }

  validate(): boolean {
    this._logic.withChildren((x) => x.validate());
    this._subscriptions?.runMatchingListeners(this, ControlChange.Validate);
    return this.valid;
  }

  get fields(): ControlFields<V> {
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

  setInitialValue(v: V) {
    this.setValueAndInitial(v, v);
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
    runTransaction(this, () => {
      this._logic.withChildren((x) => x.clearErrors());
      this.setErrors(null);
    });
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
      this.valueChanged(from);
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
      if (exE?.[key] == error) return;
      if (error) {
        if (exE) exE[key] = error;
        else this._errors = { [key]: error };
      } else {
        if (exE) {
          if (Object.values(exE).length === 1) this._errors = undefined;
          else delete exE[key];
        }
      }
      const hasErrors = this._errors != null;
      if (hadErrors != hasErrors) this.validityChanged(hasErrors);
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
        this.validityChanged(exactErrors != null);
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

const objConst = {}.constructor;
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
    if (a.constructor !== objConst) return false;
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    return keys.every((k) => childEquals(k)(a[k], b[k]));
  }
  return a !== a && b !== b;
}
export function resolveSetup(
  delayedSetup: DelayedSetup<any>,
): ResolvedControlSetup {
  const setup = (
    typeof delayedSetup === "function" ? delayedSetup() : delayedSetup
  ) as ResolvedControlSetup;
  if (setup.resolved) return setup;
  setup.resolved = true;
  if (setup.elems) {
    setup.elems = resolveSetup(setup.elems);
  } else if (setup.fields) {
    const f = setup.fields;
    for (const k in f) {
      f[k] = resolveSetup(f[k]!);
    }
  }
  if (setup.equals!) return setup;
  if (setup.elems)
    setup.equals = (a, b) => deepEquals(a, b, () => setup.elems!.equals!);
  else if (setup.fields)
    setup.equals = (a, b) =>
      deepEquals(a, b, (field) => {
        const childSetup = setup.fields![field!];
        if (childSetup) return childSetup.equals!;
        return deepEquals;
      });
  else setup.equals = deepEquals;
  return setup;
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

class ConfiguredControlLogic extends ControlLogic {
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

export function collectChanges<A>(
  listener: ChangeListenerFunc<any>,
  run: () => A,
): A {
  const prevCollect = collectChange;
  setChangeCollector(listener);
  try {
    return run();
  } finally {
    setChangeCollector(prevCollect);
  }
}

export function createCleanupScope(): CleanupScopeImpl {
  let cleanups: (() => void)[] = [];
  return {
    cleanup() {
      cleanups.forEach((x) => x());
      cleanups = [];
    },
    addCleanup(cleanup: () => void) {
      cleanups.push(cleanup);
    },
  };
}

/**
 * @deprecated Use Control.addCleanup()
 */
export function addCleanup(c: Control<any>, cleanup: () => void) {
  c.addCleanup(cleanup);
}

export function addDependent(parent: CleanupScope, child: Control<any>) {
  parent.addCleanup(() => child.cleanup());
}

/**
 * @deprecated Use Control.cleanup()
 */
export function cleanupControl(c: Control<any>) {
  c.cleanup();
}

export function controlNotNull<V>(
  c: Control<V | null | undefined> | undefined | null,
): Control<V> | undefined {
  return !c || c.isNull ? undefined : (c as Control<V>);
}

export function getControlPath(
  c: Control<any>,
  untilParent?: Control<any>,
): (string | number)[] {
  const path: (string | number)[] = [];
  let current = c as InternalControl;
  while (current) {
    if (current === untilParent) break;
    const parent = current.parents?.[0];
    if (!parent) break;
    path.push(parent.key!);
    current = parent.control;
  }
  return path.reverse();
}

export function withChildren(
  parent: Control<any>,
  f: (c: Control<any>) => void,
) {
  return (parent as InternalControl)._logic.withChildren(f);
}

export function delayedValue<V>(v: () => V): Value<V> {
  return new DelayedValue(v);
}
class DelayedValue<V> implements Value<V> {
  constructor(private _value: () => V) {}
  get value() {
    return this._value();
  }
}
