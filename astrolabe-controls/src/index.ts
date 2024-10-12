import { ControlImpl, newControl } from "./controlImpl";

const parent = newControl({ ok: "sdads", umm: "cool" });

const { ok } = parent.fields;
console.log(parent);
console.log(ok);
const hai = parent.value;
ok.value = "WOW";
parent.fields.umm.value = "Changed";
console.log(parent.value);
console.log(ok.value);
console.log(hai);
parent.value = { ok: "Changed", umm: "Changed again" };
console.log(ok.value);
console.log(parent.value);
