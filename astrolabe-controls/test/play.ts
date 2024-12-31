import { newControl } from "../src";

const c = newControl({ toString: "" });
const child = c.fields["toString"];
console.log(child);
child.as();
