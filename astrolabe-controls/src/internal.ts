import { Control } from "./types";
import { Subscriptions } from "./subscriptions";
import { runTransaction } from "./transactions";

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

export interface ParentLink {
  control: InternalControl;
  key: string | number;
  origIndex?: number;
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
}

export abstract class ControlLogic {
  control!: InternalControl;

  constructor(
    public isEqual: (v1: unknown, v2: unknown) => boolean,
    public parents?: ParentLink[],
  ) {}

  attach(c: InternalControl): void {
    this.control = c;
    this.control._logic = this;
  }

  detachParent(c: InternalControl) {
    if (!this.parents) {
      return;
    }
    this.parents = this.parents.filter((p) => p.control !== c);
  }
  addParent(c: InternalControl, key: string | number) {
    if (!this.parents) {
      this.parents = [];
    }
    const link: ParentLink = { control: c, key };
    if (typeof key === "number") {
      link.origIndex = key;
    }
    this.parents.push(link);
  }

  abstract withChildren(f: (c: InternalControl) => void): void;
  abstract getField(p: string): InternalControl;
  abstract getElements(): InternalControl[];
  initialValueChanged(): void {}

  childValueChange(prop: string | number, v: unknown): void {
    throw new Error("Should never get here");
  }

  valueChanged(from?: InternalControl) {
    this.parents?.forEach((l) => {
      if (l.control !== from)
        l.control._logic.childValueChange(l.key, this.control._value);
    });
  }

  updateArrayIndex(parent: InternalControl, index: number) {
    const existing = this.parents?.find((p) => p.control === parent);
    if (existing) {
      existing.key = index;
    } else {
      const newEntry = { control: parent, key: index, origIndex: index };
      if (!this.parents) this.parents = [newEntry];
      else this.parents.push(newEntry);
    }
  }

  childrenValid() {
    return true;
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
      c._logic.validityChanged(hasErrors);
    });
  }
}
