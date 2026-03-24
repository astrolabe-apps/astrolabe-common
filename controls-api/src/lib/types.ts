/**
 * @astroapps/controls — type spec
 *
 * This file defines the public API for the core controls package.
 * See also: react-types.ts for the @astroapps/controls-react spec.
 */

// ── Value types ──────────────────────────────────────────────────────

export type ControlValidator<V> =
  | ((v: V) => string | undefined | null)
  | null;

export interface ControlSetup<V> {
  validator?: ControlValidator<V>;
  fields?: {
    [K in keyof NonNullable<V>]?: ControlSetup<NonNullable<V>[K]>;
  };
  elems?: V extends Array<infer X> ? ControlSetup<X> : unknown;
  afterCreate?: (control: Control<V>) => void;
  meta?: Record<string, unknown>;
  dontClearError?: boolean;
}

// ── Change tracking ──────────────────────────────────────────────────

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

export type ChangeListenerFunc<V> = (
  control: Control<V>,
  change: ControlChange,
  wc: WriteContext,
) => void;

export type Subscription = {
  mask: ControlChange;
  listener: ChangeListenerFunc<any>;
};

// ── Field/Element type helpers ───────────────────────────────────────

type FieldsUndefined<V> = { [K in keyof V]-?: V[K] | undefined };

type FieldsMapNull<T> = undefined extends T
  ? FieldsUndefined<T>
  : null extends T
    ? FieldsUndefined<T>
    : T;

type OnlyObjects<V> = V extends string | number | boolean | Array<any>
  ? never
  : { [K in keyof V]-?: Control<V[K]> };

export type ControlFields<V> = NonNullable<OnlyObjects<FieldsMapNull<V>>>;

export type ControlElements<V> = V extends (infer A)[]
  ? Control<A>[]
  : V extends string | number | { [k: string]: any }
    ? never[]
    : NonNullable<V>;

// ── Control ──────────────────────────────────────────────────────────

export interface Control<V> {
  readonly uniqueId: number;

  // Snapshot reads (no subscription, no side effects)
  readonly valueNow: V;
  readonly initialValueNow: V;
  readonly validNow: boolean;
  readonly dirtyNow: boolean;
  readonly touchedNow: boolean;
  readonly disabledNow: boolean;
  readonly errorNow: string | null | undefined;
  readonly errorsNow: Record<string, string>;
  readonly isNullNow: boolean;

  // Structural navigation
  readonly fields: ControlFields<V>;
  readonly elements: ControlElements<V>;

  // Subscriptions
  subscribe(
    listener: ChangeListenerFunc<V>,
    mask: ControlChange,
  ): Subscription;
  unsubscribe(subscription: Subscription): void;

  // Metadata
  meta: Record<string, unknown>;
}

export type ControlValue<C> = C extends Control<infer V> ? V : never;

// ── ReadContext ───────────────────────────────────────────────────────

/**
 * ReadContext — explicit reactive read context.
 * Reading through it registers a dependency on the control+property pair.
 */
export interface ReadContext {
  getValue<V>(control: Control<V>): V;
  getInitialValue<V>(control: Control<V>): V;
  isValid(control: Control<unknown>): boolean;
  isDirty(control: Control<unknown>): boolean;
  isTouched(control: Control<unknown>): boolean;
  isDisabled(control: Control<unknown>): boolean;
  isNull(control: Control<unknown>): boolean;
  getError(control: Control<unknown>): string | null | undefined;
  getErrors(control: Control<unknown>): Record<string, string>;
  getElements<V>(control: Control<V[]>): Control<V>[];
}

// ── WriteContext ──────────────────────────────────────────────────────

/**
 * WriteContext — explicit write context for batched mutations.
 * Only exists for the duration of a ControlContext.update() callback.
 */
export interface WriteContext {
  setValue<V>(control: Control<V>, value: V): void;
  updateValue<V>(control: Control<V>, cb: (current: V) => V): void;
  setValueAndInitial<V>(control: Control<V>, value: V, initial: V): void;
  setInitialValue<V>(control: Control<V>, value: V): void;
  markAsClean(control: Control<unknown>): void;

  setTouched(
    control: Control<unknown>,
    touched: boolean,
    notChildren?: boolean,
  ): void;
  setDisabled(
    control: Control<unknown>,
    disabled: boolean,
    notChildren?: boolean,
  ): void;
  setError(
    control: Control<unknown>,
    key: string,
    error?: string | null,
  ): void;
  setErrors(
    control: Control<unknown>,
    errors?: Record<string, string | null | undefined> | null,
  ): void;
  clearErrors(control: Control<unknown>): void;

  addElement<V>(
    control: Control<V[]>,
    child: V,
    index?: number,
  ): Control<V>;
  removeElement<V>(
    control: Control<V[]>,
    child: number | Control<V>,
  ): void;
  updateElements<V>(
    control: Control<V[]>,
    cb: (elems: Control<V>[]) => Control<V>[],
  ): Control<V>[];

  afterChanges(cb: () => void): void;
}

// ── ControlContext ────────────────────────────────────────────────────

/**
 * ControlContext — tree-level configuration and factory.
 * The central object in the core: provides control creation, write batching,
 * read context creation, and tree-level configuration (equality).
 */
export interface ControlContext {
  /** Create a new control with the given initial value */
  newControl<V>(value: V, setup?: ControlSetup<V>): Control<V>;

  /** Execute a batch of writes; subscribers run after the callback completes */
  update(cb: (wc: WriteContext) => void): void;

  // Design note: a method for creating tracking ReadContext instances
  // (for reactive dependency tracking during renders/effects) is planned
  // but the exact API is TBD.

  /** Mark a tracker as dead (alive=false); cleanup is deferred via lazy sweep */
  markTrackerDead(tracker: { alive: boolean; cleanup(): void }): void;

  /** Revive a tracker (alive=true); cancels pending cleanup (React strict mode safe) */
  reviveTracker(tracker: { alive: boolean; cleanup(): void }): void;

  /** The equality function used for value comparison across this tree */
  readonly equals: (a: unknown, b: unknown) => boolean;
}

/*
 * Design notes:
 *
 * - A "tracking" ReadContext implementation would record (control, ControlChange)
 *   pairs during execution, then reconcile subscriptions after the render/effect
 *   completes. The exact shape (class vs function, SubscriptionTracker abstraction)
 *   is TBD.
 *
 * - A "noop" ReadContext would return snapshot values (*Now properties) without
 *   subscribing. Useful for tests, one-shot reads, or event handlers.
 */
