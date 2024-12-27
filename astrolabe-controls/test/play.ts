import { Control, newControl } from "../src";

const c = newControl({ hair: { length: 10, colour: "orange" } });
c.fields.hair.fields.colour.value = "blonde";
console.log(c.value);
debugger;
