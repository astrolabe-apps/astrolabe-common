import { testNodeState } from "./nodeTester";
import { dataControl, lengthValidator } from "../src";

const [c] = [
  {
    schema: {
      field: "pr",
      type: "String",
      collection: true,
      notNullable: true,
      children: null,
    },
    data: { pr: [] },
    minLength: 1,
    maxLength: 51,
  },
];

const { schema, data, minLength, maxLength } = c;

const state = testNodeState(
  dataControl(schema.field, undefined, {
    validators: [lengthValidator(minLength, maxLength)],
  }),
  schema,
  { data },
);

const value = data.pr;

console.log(state.valid);
