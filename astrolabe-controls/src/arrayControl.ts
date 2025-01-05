import { Control, ControlChange } from "./types";
import { ControlFlags, ControlLogic, InternalControl } from "./internal";
import { runTransaction } from "./transactions";

export class ArrayLogic extends ControlLogic {
  _elems!: InternalControl[];

  constructor(
    isEqual: (v1: unknown, v2: unknown) => boolean,
    public makeChild: (
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
        child.updateParentLink(this.control, i);
      }
      return child;
    });
    if (noInitial && newElems.length != origLength) {
      tc._subscriptions?.applyChange(ControlChange.Structure);
    }
    if (newElems.length < origLength) {
      existing
        .slice(newElems.length)
        .forEach((x) => x.updateParentLink(this.control, undefined));
    }
    this._elems = newElems;
  }

  valueChanged() {
    this.updateFromValue(this._elems, true);
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

  childrenValid(): boolean {
    return this._elems.every((x) => x.isValid());
  }
}

export function updateElements<V>(
  control: Control<V[] | null | undefined>,
  cb: (elems: Control<V>[]) => Control<V>[],
): void {
  const c = control as unknown as InternalControl;
  const oldElems = c.current.elements as InternalControl[];
  const arrayLogic = c._logic as ArrayLogic;
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
      xc.updateParentLink(c, i);
    });
    if (newElems.length < oldElems.length) {
      oldElems
        .slice(newElems.length)
        .forEach((x) => x.updateParentLink(c, undefined));
    }
    arrayLogic._elems = newElems as unknown as InternalControl[];
    c._flags &= ~ControlFlags.ChildInvalid;
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
  const c = control as InternalControl<V[]>;
  const e = c.current.elements;
  const arrayLogic = c._logic as ArrayLogic;
  const newChild = arrayLogic.makeChild(child, child, 0);
  if (typeof index === "object") {
    index = e.indexOf(index as any);
  }
  let newElems = [...e] as unknown as InternalControl[];
  if (typeof index === "number" && index < e.length) {
    newElems.splice(index + (insertAfter ? 1 : 0), 0, newChild);
  } else {
    newElems.push(newChild);
  }
  updateElements(c, () => newElems);
  return newChild as unknown as Control<V>;
}

export function newElement<V>(control: Control<V[]>, elem: V): Control<V> {
  // ensure array logic is initialized
  control.current.elements;
  const arrayLogic = (control as unknown as InternalControl)
    ._logic as ArrayLogic;
  return arrayLogic.makeChild(elem, elem, 0) as unknown as Control<V>;
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
  const elems = control.current.elements;
  const wantedIndex = typeof child === "number" ? child : elems.indexOf(child);
  if (wantedIndex < 0 || wantedIndex >= elems.length) return;
  updateElements(control as Control<V[]>, (ex) =>
    ex.filter((x, i) => i !== wantedIndex),
  );
}
