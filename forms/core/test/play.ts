import { testNodeState } from "./nodeTester";
import {
  dataControl,
  dataExpr,
  defaultEvaluators,
  DynamicPropertyType,
} from "../src";

const [c] = [
  {
    schema: {
      field: " ",
      type: "String",
      collection: false,
      notNullable: false,
      children: null,
    },
    data: { " ": " " },
  },
];
const { schema, data } = c;
const firstChild = testNodeState(
  dataControl(schema.field, undefined, {
    dynamic: [
      {
        type: DynamicPropertyType.Label,
        expr: dataExpr(schema.field),
      },
    ],
  }),
  schema,
  {
    evalExpression: (e, ctx) => {
      debugger;
      defaultEvaluators[e.type]?.(e, ctx);
      // ctx.returnResult("COOL");
    },
  },
);
debugger;
// expect(firstChild.definition.title).toBe(data[schema.field]);
