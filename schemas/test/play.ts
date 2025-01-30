import { makeDataNode } from "./gen";
import {
  compoundField,
  defaultControlForField,
  legacyFormNode,
  visitFormDataInContext,
} from "../src";

const testData = {
  field: {
    field: "",
    type: "Compound",
    collection: true,
    notNullable: true,
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
  newValues: [[{ "": "" }], [{ "": "" }]],
};
const fv = testData;
const def = defaultControlForField(fv.field);
const dataNode = makeDataNode({
  field: compoundField("", [fv.field])(""),
  value: { [fv.field.field]: fv.value },
});
const collectedValues: any[] = [];
visitFormDataInContext(dataNode, legacyFormNode(def), (data) => {
  collectedValues.push(data.control.value);
});
console.log(collectedValues);
