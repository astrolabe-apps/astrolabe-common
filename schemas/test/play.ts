import { changeValue, FieldAndValue, makeDataNode } from "./gen";
import { getDiffObject } from "../src";


const fv = {
  field: {
    field: "",
    type: "Compound",
    collection: true,
    notNullable: false,
    children: [
      {
        field: "",
        type: "String",
        collection: false,
        notNullable: false,
        children: null,
      },
    ],
  },
  value: [{ "": "" }],
  index: 0,
  add: false,
} as FieldAndValue;

const dataNode = makeDataNode(fv);
const arrayControl = dataNode.control!;
let results: any = undefined;
arrayControl.as<any[]>().elements.forEach((control) => {
  const result = { ...control.value };
  const newValue = { ...control.value };
  dataNode.schema.getChildNodes().forEach((child, i) => {
    const field = child.field;
    const fieldName = field.field;
    if (i % 2 == 0) {
      const nv = changeValue(newValue[fieldName], field);
      newValue[fieldName] = nv;
      result[fieldName] = nv;
    } else {
      delete result[fieldName];
    }
  });
  control.value = newValue;
  if (!results) results = [];
  results.push(result);
});
console.log(fv.value);
console.log(arrayControl.value);
console.log(results);
console.log(getDiffObject(dataNode));
