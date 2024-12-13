export type ControlValidator<V> = ((v: V) => string | undefined | null) | null;

// export type DelayedSetup<V, M> = ControlSetup<V, M> | (() => ControlSetup<V, M>);
export interface ControlSetup<V, M = {}> {
  validator?: ControlValidator<V>;
  isEqual?: (v1: unknown, v2: unknown) => boolean;
  fields?: { [K in keyof NonNullable<V>]?: ControlSetup<NonNullable<V>[K], M> };
  elems?: ControlSetup<V extends Array<infer X> ? X : unknown, M>;
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

export interface ControlProperties<V> {
  value: V;
  initialValue: V;
  error: string | null | undefined;
  // readonly errors: { [k: string]: string };
  readonly valid: boolean;
  readonly dirty: boolean;
  disabled: boolean;
  touched: boolean;
  readonly fields: V extends string | number | undefined | null
    ? {}
    : {
        [K in keyof NonNullable<V>]-?: Control<NonNullable<V>[K]>;
      };
  readonly elements: Control<
    NonNullable<V> extends Array<infer X> ? X : unknown
  >[];
  readonly isNull: boolean;
}

export interface Control<V> extends ControlProperties<V> {
  uniqueId: number;
  subscribe(listener: ChangeListenerFunc<V>, mask: ControlChange): Subscription;
  unsubscribe(subscription: ChangeListenerFunc<V> | Subscription): void;
  isEqual: (v1: unknown, v2: unknown) => boolean;
  current: ControlProperties<V>;
  setError(key: string, error?: string | null): void;
  setErrors(errors: { [k: string]: string | null | undefined }): void;
  setValue(cb: (v: V) => V): void;
  element: any;
}

export type ControlValue<C> = C extends Control<infer V> ? V : never;
