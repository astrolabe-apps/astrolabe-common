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
  childValueChange(v: unknown, from: ControlImpl<unknown> | undefined): void;
  childInitialValueChange(
    v: unknown,
    from: ControlImpl<unknown> | undefined,
  ): void;
  childFlagChange(
    flags: ControlFlags,
    from: ControlImpl<unknown> | undefined,
  ): void;
}

interface ParentListener {
  control: ControlImpl<unknown>;
  childValueChange(prop: string | number, v: unknown): void;
  childInitialValueChange(prop: string | number, v: unknown): void;
  childFlagChange(prop: string | number, flags: ControlFlags): void;
}

interface ControlStateImpl<V> {
  getValue(): V;
  getInitialValue(): V;
  setValue(v: V, from?: ControlImpl<unknown>): boolean;
  getFields(): V extends string | number | Array<any> | undefined | null
    ? undefined
    : V extends { [a: string]: any }
      ? { [K in keyof V]-?: Control<V[K]> }
      : V;
}

export class ControlImpl<V> {
  state: ControlStateImpl<V>;

  constructor(
    initState: (c: ControlImpl<V>) => ControlStateImpl<V>,
    public _value: V,
    public _initialValue: V,
    public _flags: ControlFlags,
    public _parents: ParentListeners | undefined,
    public _errors?: { [k: string]: string },
  ) {
    this.state = initState(this);
  }

  get value(): V {
    return this.state.getValue();
  }

  get initialValue(): V {
    return this.state.getInitialValue();
  }

  set value(v: V) {
    this.state.setValue(v);
  }

  get fields(): V extends string | number | Array<any> | undefined | null
    ? undefined
    : V extends { [a: string]: any }
      ? { [K in keyof V]-?: Control<V[K]> }
      : V {
    return this.state.getFields();
  }
}

class ValueState<V> implements ControlStateImpl<V> {
  constructor(public control: ControlImpl<V>) {}

  getFields(): V extends string | number | any[] | null | undefined
    ? undefined
    : V extends { [a: string]: any }
      ? { [K in keyof V]-?: Control<V[K]> }
      : V {
    const objectControl = new ObjectControl(this.control);
    this.control.state = objectControl;
    return objectControl.getFields();
  }

  getValue(): V {
    return this.control._value;
  }
  getInitialValue(): V {
    return this.control._initialValue;
  }
  setValue(v: V, from?: ControlImpl<unknown>): boolean {
    const c = this.control;
    const changed = c._value !== v;
    if (changed) {
      c._value = v;
      this.control._parents?.childValueChange(v, from);
    }
    return changed;
  }
}

class ObjectControl<V> extends ValueState<V> implements ParentListener {
  private _fields: Record<string, ControlImpl<unknown>> = {};
  constructor(control: ControlImpl<V>) {
    super(control);
  }
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
      changed ||= fv.state.setValue(cv, c);
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
      (c) => new ValueState(c),
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
  childValueChange(v: unknown, from?: ControlImpl<unknown>): void {
    if (this.parent.control === from) return;
    this.parent.childValueChange(this.child, v);
  }
  childInitialValueChange(v: unknown, from?: ControlImpl<unknown>): void {
    if (this.parent.control === from) return;
    this.parent.childInitialValueChange(this.child, v);
  }
  childFlagChange(flags: ControlFlags, from?: ControlImpl<unknown>): void {
    if (this.parent.control === from) return;
    this.parent.childFlagChange(this.child, flags);
  }
}

export function newControl<V>(v: V) {
  return new ControlImpl(
    (c) => new ValueState(c),
    v,
    v,
    ControlFlags.None,
    undefined,
  );
}
