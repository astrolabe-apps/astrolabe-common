import { Control, ControlValidator } from "./types";
import { Subscriptions } from "./subscriptions";

export enum ControlFlags {
  None = 0,
  Touched = 1,
  Disabled = 2,
  ChildInvalid = 4,
  DontClearError = 8,
}

export interface InternalMeta {
  cleanup?: () => void;
}

export function getInternalMeta(c: Control<any>): InternalMeta | undefined {
  return c.meta["$internal"] as InternalMeta | undefined;
}

export function setInternalMeta(c: Control<any>, meta: InternalMeta) {
  c.meta["$internal"] = meta;
}

export interface ResolvedControlSetup {
  validator?: ControlValidator<any>;
  equals: (v1: unknown, v2: unknown) => boolean;
  fields?: {
    [k: string]: ResolvedControlSetup;
  };
  elems?: ResolvedControlSetup;
  afterCreate?: (control: Control<any>) => void;
  meta?: {};
  resolved: boolean;
}

export interface ParentLink {
  control: InternalControl;
  key: string | number;
  origKey?: string | number;
}

export interface InternalControl<V = unknown> extends Control<V> {
  _value: V;
  _initialValue: V;
  _flags: ControlFlags;
  _subscriptions?: Subscriptions;
  _logic: ControlLogic;
  isValid(): boolean;
  getField(p: string): InternalControl;
  setValueImpl(v: V, from?: InternalControl): void;
  setInitialValueImpl(v: V): void;
  runListeners(): void;
  validityChanged(hasErrors: boolean): void;
  updateParentLink(
    parent: InternalControl,
    key: string | number | undefined,
  ): void;
}

export abstract class ControlLogic {
  control!: InternalControl;

  constructor(public isEqual: (v1: unknown, v2: unknown) => boolean) {}

  attach(c: InternalControl): void {
    this.control = c;
    this.control._logic = this;
  }

  abstract withChildren(f: (c: InternalControl) => void): void;
  abstract getField(p: string): InternalControl;
  abstract getElements(): InternalControl[];
  initialValueChanged(): void {}

  valueChanged(): void {}

  childValueChange(prop: string | number, v: unknown): void {
    throw new Error("Should never get here");
  }

  childrenValid() {
    return true;
  }
}
