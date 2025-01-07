export type ControlValidator<V> = ((v: V) => string | undefined | null) | null;

export type DelayedSetup<V, M = {}> =
  | ControlSetup<V, M>
  | (() => ControlSetup<V, M>);
export interface ControlSetup<V, M = {}> {
  validator?: ControlValidator<V>;
  equals?: (v1: unknown, v2: unknown) => boolean;
  fields?: { [K in keyof NonNullable<V>]?: DelayedSetup<NonNullable<V>[K], M> };
  elems?: V extends Array<infer X> ? DelayedSetup<X, M> : unknown;
  afterCreate?: (control: Control<V>) => void;
  meta?: Partial<M>;
}

export type ChangeListenerFunc<V> = (
  control: Control<V>,
  cb: ControlChange,
) => void;

export type Subscription = {
  mask: ControlChange;
  listener: ChangeListenerFunc<any>;
};

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

export type ControlFields<V> = V extends
  | string
  | number
  | boolean
  | Array<any>
  | undefined
  | null
  ? never
  : { [K in keyof V]-?: Control<V[K]> };

export type ControlElements<V> = V extends (infer A)[]
  ? Control<A>[]
  : V extends string | number | { [k: string]: any }
    ? never[]
    : NonNullable<V>;

export interface ControlProperties<V> {
  value: V;
  initialValue: V;
  error: string | null | undefined;
  readonly errors: { [k: string]: string };
  readonly valid: boolean;
  readonly dirty: boolean;
  disabled: boolean;
  touched: boolean;
  readonly fields: ControlFields<V>;
  readonly elements: ControlElements<V>;
  readonly isNull: boolean;
}

export interface Control<V> extends ControlProperties<V> {
  uniqueId: number;
  subscribe(listener: ChangeListenerFunc<V>, mask: ControlChange): Subscription;
  unsubscribe(subscription: Subscription): void;
  isEqual: (v1: unknown, v2: unknown) => boolean;
  current: ControlProperties<V>;
  setError(key: string, error?: string | null): void;
  setErrors(errors?: { [k: string]: string | null | undefined } | null): void;
  setValue(cb: (v: V) => V): void;
  setValueAndInitial(v: V, iv: V): void;
  setInitialValue(v: V): void;
  setTouched(touched: boolean, notChildren?: boolean): void;
  setDisabled(disabled: boolean, notChildren?: boolean): void;
  markAsClean(): void;
  clearErrors(): void;
  element: any;
  meta: { [k: string]: any };
  validate(): boolean;
  as<V2>(): V extends V2 ? Control<V2> : never;
  lookupControl(path: (string | number)[]): Control<any> | undefined;
}

export type ControlValue<C> = C extends Control<infer V> ? V : never;
