import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { testNodeState } from "./nodeTester";
import { randomValueForField, rootCompound } from "./gen-schema";
import {
  coerceString,
  dataControl,
  dataExpr,
  defaultEvaluators,
  DynamicPropertyType,
} from "../src";

describe("expression evaluators", () => {
  it("data expression", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(([root, f]) =>
          fc.record({
            schema: fc.constant(f),
            data: randomValueForField(root),
          }),
        ),
        ({ schema, data }) => {
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
                defaultEvaluators[e.type]?.(e, ctx);
                // ctx.returnResult("COOL");
              },
              data,
            },
          );
          expect(firstChild.definition.title).toBe(
            coerceString(data[schema.field]),
          );
        },
      ),
    );
  });
});
