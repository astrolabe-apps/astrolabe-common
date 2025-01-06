import { getElementIndex, newControl, removeElement } from "../src";
import fc from "fast-check";
import { arrayAndIndex } from "./gen";

fc.assert(
  fc.property(arrayAndIndex, arrayAndIndex, ([obj, ind], [obj2, ind2]) => {
    const control = newControl(obj);
    const allIndex = control.elements.map((x) => getElementIndex(x));
    console.log(allIndex);
    removeElement(control, ind);
    debugger;
    const nextIndex = control.elements.map((x) => getElementIndex(x));
    console.log(nextIndex);
    return false;
  }),
);
