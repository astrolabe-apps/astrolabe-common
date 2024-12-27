import { Control, ControlSetup } from "./types";
import { Subscriptions } from "./subscriptions";

export enum ControlFlags {
  None = 0,
  Touched = 1,
  Disabled = 2,
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

  attach(c: InternalControl): ControlLogic {
    this.control = c;
    this.control._logic = this;
    return this;
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
  abstract initialValueChanged(): void;

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
    if (!this.parents) {
      return;
    }
    const existing = this.parents.find((p) => p.control === parent);
    if (existing) {
      existing.key = index;
    } else {
      this.parents.push({ control: parent, key: index, origIndex: index });
    }
  }
}
