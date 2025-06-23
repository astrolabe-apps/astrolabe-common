import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { testNodeState } from "./nodeTester";
import { randomValueForField, rootCompound } from "./gen-schema";
import {
  coerceString,
  dataControl,
  dataExpr,
  dataMatchExpr,
  defaultEvaluators,
  DynamicPropertyType,
  EntityExpression,
  SchemaField,
} from "../src";

describe("expression evaluators", () => {
  it("data expression", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        ({ schema, data }) => {
          const firstChild = testLabelExpr(
            schema,
            data,
            dataExpr(schema.field),
          );
          expect(firstChild.definition.title).toBe(
            coerceString(data[schema.field]),
          );
        },
      ),
    );
  });

  it("data match expression", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        ({ schema, data }) => {
          const firstChild = testLabelExpr(
            schema,
            data,
            dataMatchExpr(schema.field, data[schema.field]),
          );
          expect(firstChild.definition.title).toBe("true");
        },
      ),
    );
  });
});

function testLabelExpr(schema: SchemaField, data: any, expr: EntityExpression) {
  return testNodeState(
    dataControl(schema.field, undefined, {
      dynamic: [
        {
          type: DynamicPropertyType.Label,
          expr,
        },
      ],
    }),
    schema,
    {
      evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
      data,
    },
  );
}
