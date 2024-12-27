import { Control, ControlChange } from "./types";
import {
  ControlFlags,
  ControlLogic,
  InternalControl,
  ParentLink,
} from "./internal";
import { runTransaction } from "./transactions";

export class ArrayLogic extends ControlLogic {
  _elems!: InternalControl[];

  constructor(
    isEqual: (v1: unknown, v2: unknown) => boolean,
    public parents: ParentLink[] | undefined,
    private makeChild: (
      v: unknown,
      iv: unknown,
      flags: ControlFlags,
    ) => InternalControl,
  ) {
    super(isEqual);
  }
  getField(p: string): InternalControl {
    throw new Error("This is an array control, not an object control.");
  }

  getElements(): InternalControl[] {
    if (!this._elems) {
      this.updateFromValue([]);
    }
    return this._elems;
  }

  updateFromValue(
    existing: InternalControl[],
    noInitial?: boolean,
    noValue?: boolean,
  ): void {
    const tc = this.control;
    const origLength = existing.length;
    const v = (tc._value as unknown[]) ?? [];
    const iv = (tc._initialValue as unknown[]) ?? [];
    const flags = tc._flags & (ControlFlags.Disabled | ControlFlags.Touched);
    const newElems = v.map((x, i) => {
      let child: InternalControl;
      if (i < origLength) {
        child = existing[i];
        if (!noValue) child.setValueImpl(x, this.control);
        if (!noInitial) child.setInitialValueImpl(iv[i]);
      } else {
        child = this.makeChild(x, iv[i], flags);
        child._logic.addParent(this.control, i);
      }
      return child;
    });
    if (noInitial && newElems.length != origLength) {
      tc._subscriptions?.applyChange(ControlChange.Structure);
    }
    if (newElems.length < origLength) {
      existing
        .slice(newElems.length)
        .forEach((x) => x._logic.detachParent(this.control));
    }
    this._elems = newElems;
  }

  valueChanged(from?: InternalControl) {
    this.updateFromValue(this._elems, true);
    super.valueChanged(from);
  }

  initialValueChanged() {
    this.updateFromValue(this._elems, false, true);
  }

  withChildren(f: (c: InternalControl) => void): void {
    this.getElements().forEach(f);
  }

  copy(v: unknown): unknown[] {
    return v == null ? [] : [...(v as unknown[])];
  }

  childValueChange(prop: string | number, v: unknown) {
    const copied = this.copy(this.control._value);
    copied[prop as number] = v;
    this.control.setValueImpl(copied);
  }
}

export function updateElements<V>(
  control: Control<V[] | null | undefined>,
  cb: (elems: Control<V>[]) => Control<V>[],
): void {
  const c = control as unknown as InternalControl;
  const arrayChildren = c._logic as ArrayLogic;
  const oldElems = arrayChildren.getElements();
  const newElems = cb(
    oldElems as unknown as Control<V>[],
  ) as unknown as InternalControl[];
  if (
    oldElems === newElems ||
    (oldElems.length === newElems.length &&
      oldElems.every((x, i) => x === newElems[i]))
  )
    return;

  runTransaction(c, () => {
    newElems.forEach((x, i) => {
      const xc = x as InternalControl<V>;
      xc._logic.updateArrayIndex(c, i);
    });
    if (newElems.length < oldElems.length) {
      oldElems.slice(newElems.length).forEach((x) => x._logic.detachParent(c));
    }
    arrayChildren._elems = newElems as unknown as InternalControl<unknown>[];
    c.setValueImpl(newElems.map((x) => x.current.value));
    c._subscriptions?.applyChange(ControlChange.Structure);
  });
}

export function addElement<V>(
  control: Control<V[] | undefined | null>,
  child: V,
  index?: number | Control<V> | undefined,
  insertAfter?: boolean,
): Control<V> {
  throw new Error("Not implemented");
  // const e = control.current.elements;
  // if (e) {
  //   const c = control as InternalControl<V[]>;
  //   const newChild = c.newChild(child, child, 0);
  //   if (typeof index === "object") {
  //     index = e.indexOf(index as any);
  //   }
  //   let newElems = [...e];
  //   if (typeof index === "number" && index < e.length) {
  //     newElems.splice(index + (insertAfter ? 1 : 0), 0, newChild);
  //   } else {
  //     newElems.push(newChild);
  //   }
  //   updateElements(control as Control<V[]>, () => newElems);
  //   return newChild;
  // } else {
  //   control.value = [child];
  //   return control.current.elements[0];
  // }
}

export function newElement<V>(control: Control<V[]>, elem: V): Control<V> {
  throw new Error("Not implemented");
  // return (control as InternalControl<V[]>).newChild(elem, elem, 0);
}

/**
 * Remove an element from a `Control` containing an array.
 * @param control The Control containing an array
 * @param child The child index or `Control` to remove from the array.
 */
export function removeElement<V>(
  control: Control<V[] | undefined | null>,
  child: number | Control<V>,
): void {
  const c = control.current.elements;
  if (c) {
    const wantedIndex = typeof child === "number" ? child : c.indexOf(child);
    if (wantedIndex < 0 || wantedIndex >= c.length) return;
    updateElements(control as Control<V[]>, (ex) =>
      ex.filter((x, i) => i !== wantedIndex),
    );
  }
}
