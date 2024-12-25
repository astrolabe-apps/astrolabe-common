import { Control } from "./types";

export function updateElements<V>(
  control: Control<V[] | null | undefined>,
  cb: (elems: Control<V>[]) => Control<V>[],
): void {
  throw new Error("Not implemented");
  // const c = control as unknown as InternalControl<any>;
  // const arrayChildren = c.getArrayChildren() as ArrayControl<V[]>;
  // const oldElems = arrayChildren.getElements();
  // const newElems = cb(oldElems);
  // if (
  //   oldElems === newElems ||
  //   (oldElems.length === newElems.length &&
  //     oldElems.every((x, i) => x === newElems[i]))
  // )
  //   return;
  //
  // runTransaction(c, () => {
  //   newElems.forEach((x, i) => {
  //     const xc = x as InternalControl<V>;
  //     xc.setParentAttach(c, i);
  //   });
  //   if (newElems.length < oldElems.length) {
  //     oldElems
  //       .slice(newElems.length)
  //       .forEach((x) => x.setParentAttach(c, undefined));
  //   }
  //   arrayChildren._elems = newElems as unknown as InternalControl<unknown>[];
  //   c.setValueImpl(newElems.map((x) => x.current.value));
  //   c._subscriptions?.applyChange(ControlChange.Structure);
  // });
}

export function addElement<V>(
  control: Control<V[] | undefined | null>,
  child: V,
  index?: number | Control<V> | undefined,
  insertAfter?: boolean,
): Control<V> {
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
  throw new Error("Not implemented");
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
  throw new Error("Not implemented");
  //
  // const c = control.current.elements;
  // if (c) {
  //   const wantedIndex = typeof child === "number" ? child : c.indexOf(child);
  //   if (wantedIndex < 0 || wantedIndex >= c.length) return;
  //   updateElements(control as Control<V[]>, (ex) =>
  //     ex.filter((x, i) => i !== wantedIndex),
  //   );
  // }
}
