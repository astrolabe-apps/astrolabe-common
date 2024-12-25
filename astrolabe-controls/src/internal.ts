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

export interface ControlStorage {
  setValue(c: InternalControl<unknown>, v: unknown): void;
  getValue(c: InternalControl<unknown>): unknown;
  setInitialValue(c: InternalControl<unknown>, v: unknown): void;
  getInitialValue(c: InternalControl<unknown>): unknown;
  isNull(c: InternalControl<unknown>): boolean;
  getElements(c: InternalControl<unknown>): InternalControl<unknown>[];
  getField(
    c: InternalControl<unknown>,
    field: string,
  ): InternalControl<unknown>;
  visitChildren(op: (c: InternalControl<unknown>) => boolean): boolean;
}

export interface InternalControl<V> extends Control<V> {
  _subscriptions?: Subscriptions;
  _storageKey: string | number | undefined;
  runListeners(): void;
}
