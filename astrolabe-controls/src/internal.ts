import { Control, ControlSetup } from "./types";
import { Subscriptions } from "./subscriptions";

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

export interface InternalControl<V> extends Control<V> {
  _value: V;
  _initialValue: V;
  _flags: ControlFlags;
  _subscriptions?: Subscriptions;
  _setup?: ControlSetup<V>;
  _children?: ChildState;
  setValueImpl(v: V, fromParent?: InternalControl<unknown>): boolean;
  setInitialValueImpl(v: V, fromParent?: InternalControl<unknown>): boolean;
  newChild<V2>(
    value: V2,
    initialValue: V2,
    childProps: number | string,
    parent?: ParentListener,
  ): InternalControl<V2>;
  runListeners(): void;
  setParentAttach(
    c: InternalControl<any>,
    i: number | string | undefined,
  ): void;
  getArrayChildren(): ChildState;
}

export interface ParentListener {
  control: InternalControl<unknown>;
  childValueChange(prop: string | number, v: unknown): void;
  childInitialValueChange(prop: string | number, v: unknown): void;
  childFlagChange(prop: string | number, flags: ControlFlags): void;
}

export interface ChildState extends ParentListener {
  updateChildValues(): void;
  updateChildInitialValues(): void;
}
