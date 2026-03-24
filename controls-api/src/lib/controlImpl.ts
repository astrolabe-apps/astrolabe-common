import { Subscriptions } from "./subscriptions";
import {
  Control,
  ControlChange,
  ControlElements,
  ControlFields,
  ChangeListenerFunc,
  Subscription,
  WriteContext,
} from "./types";

// ── Internal types ──────────────────────────────────────────────────

export type NotifyFn = (control: ControlImpl) => void;

export const noopNotify: NotifyFn = () => {};

export enum ControlFlags {
  None = 0,
  Touched = 1,
  Disabled = 2,
  ChildInvalid = 4,
  DontClearError = 8,
}

export interface ParentLink {
  control: ControlImpl;
  key: string | number;
  origKey?: string | number;
}

export interface ControlContextInternal {
  equals: (a: unknown, b: unknown) => boolean;
  createChild: (
    value: unknown,
    initialValue: unknown,
    flags: ControlFlags,
    fieldKey?: string,
  ) => ControlImpl;
}

// ── Proxy handler for fields ────────────────────────────────────────

const FieldsProxy: ProxyHandler<ControlImpl> = {
  get(target, p) {
    if (typeof p !== "string") return undefined;
    return target.getField(p);
  },
};

// ── ControlImpl ─────────────────────────────────────────────────────

let uniqueIdCounter = 0;

export class ControlImpl<V = unknown> implements Control<V> {
  uniqueId: number;
  meta: Record<string, unknown> = {};
  _value: V;
  _initialValue: V;
  _flags: ControlFlags;
  _errors: Record<string, string> | undefined;
  _fields: Record<string, ControlImpl> | undefined;
  _elems: ControlImpl[] | undefined;
  _parents: ParentLink[] | undefined;
  _subscriptions: Subscriptions | undefined;
  _ctx: ControlContextInternal;

  constructor(
    value: V,
    initialValue: V,
    flags: ControlFlags,
    ctx: ControlContextInternal,
  ) {
    this.uniqueId = ++uniqueIdCounter;
    this._value = value;
    this._initialValue = initialValue;
    this._flags = flags;
    this._ctx = ctx;
  }

  // ── Snapshot reads ──────────────────────────────────────────────

  get valueNow(): V {
    return this._value;
  }

  get initialValueNow(): V {
    return this._initialValue;
  }

  get validNow(): boolean {
    return this.isValid();
  }

  get dirtyNow(): boolean {
    return !this._ctx.equals(this._value, this._initialValue);
  }

  get touchedNow(): boolean {
    return !!(this._flags & ControlFlags.Touched);
  }

  get disabledNow(): boolean {
    return !!(this._flags & ControlFlags.Disabled);
  }

  get errorNow(): string | null | undefined {
    const e = this._errors;
    return e ? Object.values(e)[0] : null;
  }

  get errorsNow(): Record<string, string> {
    return this._errors ?? {};
  }

  get isNullNow(): boolean {
    return this._value == null;
  }

  // ── Structural navigation ─────────────────────────────────────

  get fields(): ControlFields<V> {
    return new Proxy<any>(this, FieldsProxy);
  }

  get elements(): ControlElements<V> {
    return this.getOrCreateElements() as ControlElements<V>;
  }

  // ── Subscriptions ─────────────────────────────────────────────

  subscribe(
    listener: ChangeListenerFunc<V>,
    mask: ControlChange,
  ): Subscription {
    this._subscriptions ??= new Subscriptions();
    const currentChanges = this.getChangeState(mask);
    return this._subscriptions.subscribe(
      listener as ChangeListenerFunc<any>,
      currentChanges,
      mask,
    );
  }

  unsubscribe(subscription: Subscription): void {
    this._subscriptions?.unsubscribe(subscription);
  }

  // ── Value mutation ────────────────────────────────────────────

  setValueImpl(v: V, notify: NotifyFn, from?: ControlImpl): void {
    if (this._ctx.equals(this._value, v)) return;
    const structureFlag =
      v == null || this._value == null
        ? ControlChange.Structure
        : ControlChange.None;
    this._value = v;
    if (!(this._flags & ControlFlags.DontClearError)) {
      this.setErrorsImpl(null, notify);
    }
    // Sync existing fields down
    if (this._fields) {
      const ov = v as Record<string, unknown> | null;
      for (const k in this._fields) {
        const child = this._fields[k];
        const childValue =
          ov != null && Object.hasOwn(ov, k) ? ov[k] : undefined;
        child.setValueImpl(childValue, notify, this);
      }
    }
    // Sync existing elements down
    if (this._elems) {
      this.syncElementsOnValueChange(notify);
    }
    // Propagate upward
    this._parents?.forEach((l) => {
      if (l.control !== from) {
        this.childValueChange(l, notify);
      }
    });
    this._subscriptions?.applyChange(ControlChange.Value | structureFlag);
    notify(this);
  }

  setInitialValueImpl(v: V, notify: NotifyFn, from?: ControlImpl): void {
    if (this._ctx.equals(this._initialValue, v)) return;
    this._initialValue = v;
    // Sync existing fields down
    if (this._fields) {
      const ov = v as Record<string, unknown> | null;
      for (const k in this._fields) {
        const child = this._fields[k];
        const childValue =
          ov != null && Object.hasOwn(ov, k) ? ov[k] : undefined;
        child.setInitialValueImpl(childValue, notify);
      }
    }
    // Sync existing elements down
    if (this._elems) {
      this.syncElementsOnInitialValueChange(notify);
    }
    this._subscriptions?.applyChange(ControlChange.InitialValue);
    notify(this);
  }

  childValueChange(link: ParentLink, notify: NotifyFn): void {
    const parent = link.control;
    const pv = parent._value;
    let copied: any;
    if (Array.isArray(pv)) {
      copied = [...(pv ?? [])];
      copied[link.key] = this._value;
    } else {
      copied = { ...(pv as any), [link.key]: this._value };
    }
    parent.setValueImpl(copied, notify, this);
  }

  // ── Touched / Disabled ────────────────────────────────────────

  setTouchedImpl(
    touched: boolean,
    notify: NotifyFn,
    notChildren?: boolean,
  ): void {
    if (touched) {
      this._flags |= ControlFlags.Touched;
    } else {
      this._flags &= ~ControlFlags.Touched;
    }
    notify(this);
    if (!notChildren) {
      this.withChildren((c) => c.setTouchedImpl(touched, notify));
    }
  }

  setDisabledImpl(
    disabled: boolean,
    notify: NotifyFn,
    notChildren?: boolean,
  ): void {
    if (disabled) {
      this._flags |= ControlFlags.Disabled;
    } else {
      this._flags &= ~ControlFlags.Disabled;
    }
    notify(this);
    if (!notChildren) {
      this.withChildren((c) => c.setDisabledImpl(disabled, notify));
    }
  }

  // ── Errors / Validity ─────────────────────────────────────────

  setErrorImpl(
    key: string,
    error: string | null | undefined,
    notify: NotifyFn,
  ): void {
    const hadErrors = this._errors != null;
    if (!error) error = null;
    const exE = this._errors;
    if (exE?.[key] == error) return;
    if (error) {
      if (exE) exE[key] = error;
      else this._errors = { [key]: error };
    } else {
      if (exE) {
        if (Object.keys(exE).length === 1) this._errors = undefined;
        else delete exE[key];
      }
    }
    const hasErrors = this._errors != null;
    if (hadErrors !== hasErrors) this.validityChangedImpl(hasErrors, notify);
    this._subscriptions?.applyChange(ControlChange.Error);
    notify(this);
  }

  setErrorsImpl(
    errors: Record<string, string | null | undefined> | null | undefined,
    notify: NotifyFn,
  ): void {
    if (this._errors == null && errors == null) return;
    const realEntries = Object.entries(errors ?? {}).filter((x) => !!x[1]);
    const exactErrors = realEntries.length
      ? (Object.fromEntries(realEntries) as Record<string, string>)
      : undefined;
    if (!this._ctx.equals(exactErrors, this._errors)) {
      this._errors = exactErrors;
      this.validityChangedImpl(exactErrors != null, notify);
      this._subscriptions?.applyChange(ControlChange.Error);
      notify(this);
    }
  }

  clearErrorsImpl(notify: NotifyFn): void {
    this.withChildren((c) => c.clearErrorsImpl(notify));
    this.setErrorsImpl(null, notify);
  }

  validityChangedImpl(hasErrors: boolean, notify: NotifyFn): void {
    this._parents?.forEach((l) => {
      const c = l.control;
      const alreadyInvalid = !!(c._flags & ControlFlags.ChildInvalid);
      if (!(hasErrors && alreadyInvalid)) {
        if (hasErrors) c._flags |= ControlFlags.ChildInvalid;
        else c._flags &= ~ControlFlags.ChildInvalid;
        notify(c);
      }
      c.validityChangedImpl(hasErrors, notify);
    });
  }

  // ── Lazy creation ─────────────────────────────────────────────

  getField(p: string): ControlImpl {
    this._fields ??= Object.create(null);
    if (Object.hasOwn(this._fields!, p)) {
      return this._fields![p];
    }
    const v = getOwn(this._value, p);
    const iv = getOwn(this._initialValue, p);
    const flags = this._flags & (ControlFlags.Disabled | ControlFlags.Touched);
    const child = this._ctx.createChild(v, iv, flags, p);
    child._parents = [{ control: this, key: p }];
    this._fields![p] = child;
    return child;
  }

  getOrCreateElements(): ControlImpl[] {
    if (!this._elems) {
      const v = (this._value as unknown[] | null) ?? [];
      const iv = (this._initialValue as unknown[] | null) ?? [];
      const flags =
        this._flags & (ControlFlags.Disabled | ControlFlags.Touched);
      if (Array.isArray(v)) {
        this._elems = v.map((x, i) => {
          const child = this._ctx.createChild(x, iv[i], flags);
          child._parents = [{ control: this, key: i, origKey: i }];
          return child;
        });
      } else {
        this._elems = [];
      }
    }
    return this._elems;
  }

  syncElementsOnValueChange(notify: NotifyFn): void {
    const existing = this._elems!;
    const v = this._value;
    if (!Array.isArray(v)) {
      // Value is no longer an array — detach all elements
      existing.forEach((c) => this.detachChild(c));
      this._elems = [];
      if (existing.length > 0) {
        this._subscriptions?.applyChange(ControlChange.Structure);
      }
      return;
    }
    const origLength = existing.length;
    const iv = (this._initialValue as unknown[] | null) ?? [];
    const flags = this._flags & (ControlFlags.Disabled | ControlFlags.Touched);
    const newElems = v.map((x, i) => {
      if (i < origLength) {
        const child = existing[i];
        child.setValueImpl(x, notify, this);
        return child;
      }
      const child = this._ctx.createChild(x, iv[i], flags);
      child._parents = [{ control: this, key: i }];
      return child;
    });
    if (newElems.length !== origLength) {
      this._subscriptions?.applyChange(ControlChange.Structure);
    }
    if (newElems.length < origLength) {
      existing.slice(newElems.length).forEach((c) => this.detachChild(c));
    }
    this._elems = newElems;
  }

  syncElementsOnInitialValueChange(notify: NotifyFn): void {
    const existing = this._elems!;
    const iv = this._initialValue;
    if (!Array.isArray(iv)) {
      // InitialValue is no longer an array — detach all elements
      existing.forEach((c) => this.detachChild(c));
      this._elems = [];
      return;
    }
    const origLength = existing.length;
    const v = (this._value as unknown[] | null) ?? [];
    const flags = this._flags & (ControlFlags.Disabled | ControlFlags.Touched);
    const newElems = iv.map((x, i) => {
      if (i < origLength) {
        const child = existing[i];
        child.setInitialValueImpl(x, notify);
        child.updateParentLink(this, i, true);
        return child;
      }
      const child = this._ctx.createChild(v[i], x, flags);
      child._parents = [{ control: this, key: i, origKey: i }];
      return child;
    });
    if (newElems.length < origLength) {
      existing.slice(newElems.length).forEach((c) => this.detachChild(c));
    }
    this._elems = newElems;
  }

  // ── Helpers ───────────────────────────────────────────────────

  isValid(): boolean {
    if (this._errors != null || this._flags & ControlFlags.ChildInvalid)
      return false;
    const allValid = this.childrenValid();
    if (!allValid) this._flags |= ControlFlags.ChildInvalid;
    return allValid;
  }

  getChangeState(mask: ControlChange): ControlChange {
    let flags = ControlChange.None;
    if (mask & ControlChange.Dirty && this.dirtyNow)
      flags |= ControlChange.Dirty;
    if (mask & ControlChange.Valid && this.isValid())
      flags |= ControlChange.Valid;
    if (mask & ControlChange.Disabled && this.disabledNow)
      flags |= ControlChange.Disabled;
    if (mask & ControlChange.Touched && this.touchedNow)
      flags |= ControlChange.Touched;
    return flags;
  }

  runListeners(wc: WriteContext): void {
    const s = this._subscriptions;
    if (s) {
      const currentChanges = this.getChangeState(s.mask);
      s.runListeners(this, currentChanges, wc);
    }
  }

  validate(notify: NotifyFn, wc: WriteContext): boolean {
    this.withChildren((c) => c.validate(notify, wc));
    this._subscriptions?.runMatchingListeners(this, ControlChange.Validate, wc);
    notify(this);
    return this.isValid();
  }

  updateParentLink(
    parent: ControlImpl,
    key: string | number | undefined,
    initial?: boolean,
  ): void {
    if (key == null) {
      if (this._parents)
        this._parents = this._parents.filter((p) => p.control !== parent);
      return;
    }
    const existing = this._parents?.find((p) => p.control === parent);
    if (existing) {
      existing.key = key;
      if (initial) existing.origKey = key;
    } else {
      const entry: ParentLink = {
        control: parent,
        key,
        origKey: initial ? key : undefined,
      };
      if (!this._parents) this._parents = [entry];
      else this._parents.push(entry);
    }
  }

  // ── Private helpers ───────────────────────────────────────────

  private withChildren(f: (c: ControlImpl) => void): void {
    if (this._fields) {
      for (const k in this._fields) f(this._fields[k]);
    }
    if (this._elems) {
      this._elems.forEach(f);
    }
  }

  private childrenValid(): boolean {
    if (this._fields) {
      for (const k in this._fields) {
        if (!this._fields[k].isValid()) return false;
      }
    }
    if (this._elems) {
      for (const e of this._elems) {
        if (!e.isValid()) return false;
      }
    }
    return true;
  }

  private detachChild(child: ControlImpl): void {
    child.updateParentLink(this, undefined);
  }
}

function getOwn(v: any, p: string): unknown {
  if (v != null && typeof v === "object" && Object.hasOwn(v, p)) {
    return v[p];
  }
  return undefined;
}

export function toImpl(control: Control<any>): ControlImpl {
  return control as unknown as ControlImpl;
}
