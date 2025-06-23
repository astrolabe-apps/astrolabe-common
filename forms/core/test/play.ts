import { testNodeState } from "./nodeTester";
import {
  dataControl,
  dataExpr,
  defaultEvaluators,
  DynamicPropertyType,
  groupedControl,
} from "../src";

const [c] = [
  {
    schema: {
      field: "toString",
      type: "String",
      collection: false,
      notNullable: false,
      children: null,
    },
    data: { toString: " " },
  },
];

const { schema, data } = c;
const state = testNodeState(
  groupedControl([dataControl(schema.field, undefined, { required: true })]),
  schema,
  { data },
);
console.log(state.valid);
state.parent.control.value = {};
console.log(state.valid);
