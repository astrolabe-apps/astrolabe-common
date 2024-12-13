import { ControlChange, ControlImpl, newControl } from "./controlImpl";

const parent = newControl<any>({ child: "hai" });
const v1 = parent.subscribe(
  () => console.log("Parent changed"),
  ControlChange.Value,
);
const child = parent.fields.child;
child.subscribe((a, c) => console.log("Child changed"), ControlChange.Value);
parent.value = null;
