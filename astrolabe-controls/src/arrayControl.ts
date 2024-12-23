import { ChildState, ControlFlags, InternalControl } from "./internal";
import { Control, ControlChange, ControlElement } from "./types";
import { runTransaction } from "./transactions";

export class ArrayControl<V> implements ChildState {
  public _elems: InternalControl<unknown>[];

  constructor(public control: InternalControl<unknown>) {
    const v = (control._value ?? []) as any[];
    const iv = (control._initialValue ?? []) as any[];
    this._elems = v.map((x, i) => control.newChild(x, iv[i], i, this));
  }

  setTouched(b: boolean) {
    this._elems.forEach((x) => x.setTouched(b));
  }

  setDisabled(b: boolean) {
    this._elems.forEach((x) => x.setDisabled(b));
  }
  allValid(): boolean {
    return this._elems.every((x) => x.valid);
  }

  getElements(): InternalControl<ControlElement<NonNullable<V>>>[] {
    return this._elems as any;
  }

  updateChildValues(): void {
    const c = this.control;
    const v = (c._value ?? []) as any[];
    const iv = (c._initialValue ?? []) as any[];
    const oldElems = this._elems;
    const newLength = v.length;
    this._elems = v.map((x, i) => {
      const old = oldElems[i];
      if (old) {
        old.setValueImpl(x, c);
        old.setParentAttach(c, i);
        return old;
      }
      return this.control.newChild(x, iv[i], i, this);
    });
    if (newLength < oldElems.length) {
      oldElems.slice(newLength).forEach((x) => x.setParentAttach(c, undefined));
    }
    if (c._value == null || newLength != oldElems.length)
      c._subscriptions?.applyChange(ControlChange.Structure);
  }

  updateChildInitialValues(): void {
    const c = this.control;
    const iv = (c._initialValue ?? []) as any[];
    this._elems.forEach((x, i) => {
      x.setInitialValueImpl(iv[i], c);
    });
  }

  childValueChange(prop: string | number, v: unknown): void {
    let c = this.control;
    let curValue = c._value as any[];
    if (!(c._flags & ControlFlags.ValueMutating)) {
      curValue = [...curValue];
      c._value = curValue;
      c._flags |= ControlFlags.ValueMutating;
    }
    curValue[prop as number] = v;
    c._subscriptions?.applyChange(ControlChange.Value);
  }

  childInitialValueChange(prop: string | number, v: unknown): void {
    let c = this.control;
    let curValue = c._initialValue as any[];
    if (!(c._flags & ControlFlags.InitialValueMutating)) {
      curValue = [...curValue];
      c._initialValue = curValue;
      c._flags |= ControlFlags.InitialValueMutating;
    }
    curValue[prop as number] = v;
    c._subscriptions?.applyChange(ControlChange.InitialValue);
  }

  childFlagChange(prop: string | number, flags: ControlFlags): void {
    throw new Error("Method not implemented. childFlagChange");
  }
}

export function updateElements<V>(
  control: Control<V[] | null | undefined>,
  cb: (elems: Control<V>[]) => Control<V>[],
): void {
  const c = control as unknown as InternalControl<any>;
  const arrayChildren = c.getArrayChildren() as ArrayControl<V[]>;
  const oldElems = arrayChildren.getElements();
  const newElems = cb(oldElems);
  if (
    oldElems === newElems ||
    (oldElems.length === newElems.length &&
      oldElems.every((x, i) => x === newElems[i]))
  )
    return;

  const iv = c._initialValue ?? [];
  runTransaction(c, () => {
    newElems.forEach((x, i) => {
      const xc = x as InternalControl<V>;
      xc.setInitialValueImpl(iv[i], c);
      xc.setParentAttach(c, i);
    });
    if (newElems.length < oldElems.length) {
      oldElems
        .slice(newElems.length)
        .forEach((x) => x.setParentAttach(c, undefined));
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
  const e = control.current.elements;
  if (e) {
    const c = control as InternalControl<V[]>;
    const newChild = c.newChild(child, child, 0);
    if (typeof index === "object") {
      index = e.indexOf(index as any);
    }
    let newElems = [...e];
    if (typeof index === "number" && index < e.length) {
      newElems.splice(index + (insertAfter ? 1 : 0), 0, newChild);
    } else {
      newElems.push(newChild);
    }
    updateElements(control as Control<V[]>, () => newElems);
    return newChild;
  } else {
    control.value = [child];
    return control.current.elements[0];
  }
}

export function newElement<V>(control: Control<V[]>, elem: V): Control<V> {
  return (control as InternalControl<V[]>).newChild(elem, elem, 0);
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
