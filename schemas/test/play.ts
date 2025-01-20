import {
  changeValue,
  FieldAndValue,
  FieldAndValueChanged,
  makeDataNode,
} from "./gen";
import { getDiffObject } from "../src";
import { updateElements } from "@react-typed-forms/core";

const testData = [
  {
    field: {
      field: ")W",
      type: "Compound",
      collection: true,
      notNullable: true,
      children: [
        {
          field: "4N`rCgnDXm",
          type: "DateTime",
          collection: false,
          notNullable: false,
          children: null,
        },
      ],
    },
    value: [
      { "4N`rCgnDXm": "1970-01-01T00:00:00.000Z" },
      { "4N`rCgnDXm": "1970-01-01T00:00:00.000Z" },
      { "4N`rCgnDXm": "1970-01-01T00:00:00.000Z" },
    ],
    newValue: [
      { "4N`rCgnDXm": "1970-01-01T00:00:00.000Zx" },
      { "4N`rCgnDXm": "1970-01-01T00:00:00.000Z" },
      { "4N`rCgnDXm": "1970-01-01T00:00:00.000Zz" },
    ],
  } as FieldAndValueChanged,
  [2, 0, 1],
] as [FieldAndValueChanged, number[]];

const [fv, indexes] = testData;
const dataNode = makeDataNode(fv);
const arrayControl = dataNode.control!;

const newValue = fv.newValue as any[];
updateElements(arrayControl.as<any[]>(), (x) => {
  const sorted = indexes.map((ni, i) => {
    const c = x[ni];
    c.value = newValue[i];
    return c;
  });
  return sorted;
});
console.log(getDiffObject(dataNode));
