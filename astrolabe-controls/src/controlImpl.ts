import { Control, ControlProperties } from "@react-typed-forms/core";

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

interface ControlParent {
  parent: ControlImpl<any>;
  prop: string | number;
}

let transactionCount = 0;

export enum StateFlags {
  Valid = 1,
  Touched = 2,
  Dirty = 4,
  Disabled = 8,
}

interface ParentListeners {
  childValueChange(v: unknown, ignore: ControlImpl<unknown> | undefined): void;
  childInitialValueChange(
    v: unknown,
    ignore: ControlImpl<unknown> | undefined,
  ): void;
  childFlagChange(
    flags: ControlFlags,
    ignore: ControlImpl<unknown> | undefined,
  ): void;
}

interface ParentListener {
  control: ControlImpl<unknown>;
  childValueChange(prop: string | number, v: unknown): void;
  childInitialValueChange(prop: string | number, v: unknown): void;
  childFlagChange(prop: string | number, flags: ControlFlags): void;
}

interface ChildState<V> extends ParentListener {
  setValue(v: V, from?: ControlImpl<unknown>): boolean;
}

export class ControlImpl<V> {
  constructor(
    public _value: V,
    public _initialValue: V,
    public _flags: ControlFlags,
    public _parents?: ParentListeners,
    public _errors?: { [k: string]: string },
    public _children?: ChildState<V>,
  ) {}

  get value(): V {
    this._flags &= ~ControlFlags.ValueMutating;
    return this._value;
  }

  setValue(v: V, dontUpdate?: ControlImpl<unknown>): boolean {
    if (this._children) return this._children.setValue(v, dontUpdate);
    const changed = this._value !== v;
    if (changed) {
      this._value = v;
      this._parents?.childValueChange(v, dontUpdate);
    }
    return changed;
  }

  get initialValue(): V {
    this._flags &= ~ControlFlags.InitialValueMutating;
    return this._initialValue;
  }

  set value(v: V) {
    this.setValue(v);
  }

  get fields(): { [K in keyof V]-?: Control<V[K]> } {
    if (!this._children) {
      this._children = new ObjectControl<V>(this);
    }
    return (this._children as ObjectControl<any>).getFields();
  }
}

class ObjectControl<V> implements ChildState<V> {
  private _fields: Record<string, ControlImpl<unknown>> = {};
  constructor(public control: ControlImpl<V>) {}
  getValue(): V {
    const c = this.control;
    c._flags &= ~ControlFlags.ValueMutating;
    return c._value;
  }

  setValue(v: V, from?: ControlImpl<unknown>): boolean {
    let changed = false;
    const c = this.control;
    Object.entries(this._fields).forEach(([k, fv]) => {
      const cv = (v as any)[k];
      changed ||= fv.setValue(cv, c);
    });
    if (changed) {
      c._value = v;
      c._parents?.childValueChange(v, from);
    }
    return changed;
  }
  getFields(): V extends string | number | any[] | null | undefined
    ? undefined
    : V extends { [a: string]: any }
      ? { [K in keyof V]-?: Control<V[K]> }
      : V {
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
      (this.control._flags & ControlFlags.Disabled) |
        (v === iv ? ControlFlags.None : ControlFlags.Dirty),
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
  }
  childInitialValueChange(prop: string | number, v: V): void {
    throw new Error("Method not implemented.");
  }
  childFlagChange(prop: string | number, flags: ControlFlags): void {
    throw new Error("Method not implemented.");
  }
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
  childValueChange(v: unknown, ignore: ControlImpl<unknown> | undefined): void {
    if (this.parent.control === ignore) return;
    this.parent.childValueChange(this.child, v);
  }
  childInitialValueChange(v: unknown, ignore: ControlImpl<unknown>): void {
    if (this.parent.control === ignore) return;
    this.parent.childInitialValueChange(this.child, v);
  }
  childFlagChange(
    flags: ControlFlags,
    ignore: ControlImpl<unknown> | undefined,
  ): void {
    if (this.parent.control === ignore) return;
    this.parent.childFlagChange(this.child, flags);
  }
}

export function newControl<V>(v: V) {
  return new ControlImpl(v, v, ControlFlags.None, undefined);
}
