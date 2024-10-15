import { ControlChange, newControl } from "./controlImpl";

const parent = newControl({ ok: "sdads", umm: "cool" });

const { ok } = parent.fields;
// console.log(parent);
// console.log(ok);
// const hai = parent.value;
// ok.value = "WOW";
// parent.fields.umm.value = "Changed";
// console.log(parent.value);
// console.log(ok.value);
// console.log(hai);
// parent.value = { ok: "Changed", umm: "Changed again" };
// parent.initialValue = { ok: "Changed", umm: "Changed again" };
// console.log(ok.value);
ok.subscribe(() => console.log("Value Changed1"), ControlChange.Value);
ok.subscribe(() => console.log("Dirty"), ControlChange.Dirty);
ok.value = "WOW";
ok.subscribe(() => console.log("Changed"), ControlChange.Value);
// console.log(ok);
ok.runListeners();
ok.value = "sdads";
ok.runListeners();
ok.runListeners();
