import { ControlChange, newControl } from "../src";

const numArray = [];
const control = newControl(numArray, {
  validator: (v) => (v.length == 0 ? "Need one element" : ""),
});
control.subscribe((a, c) => console.log(c), ControlChange.Valid);
debugger;
control.value = [1];
console.log(control.valid, control.errors);
