import { ControlChange, ControlImpl, newControl } from "./controlImpl";

const parent = newControl<number[] | null>([0]);
parent.elements;
const v1 = parent.subscribe(
  (_, c) => console.log("Parent changed", c),
  ControlChange.Structure,
);
parent.value = [];
