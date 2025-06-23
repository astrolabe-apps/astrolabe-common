import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { randomValueForField, rootCompound } from "./gen-schema";
import {
  ControlDefinition,
  dataControl,
  defaultEvaluators,
  DynamicPropertyType,
  FormStateNode,
  groupedControl,
  SchemaField,
} from "../src";
import { testNodeState } from "./nodeTester";
import { Control, createSyncEffect, newControl } from "@astroapps/controls";

describe("validators", () => {
  it("required validator", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root, {
              nullableChance: 0,
              string: { minLength: 1 },
              array: { minLength: 1, maxLength: 2 },
            }),
            initialVisible: fc.boolean(),
          }),
        ),
        ({ schema, data, initialVisible }) => {
          const vis = newControl(initialVisible);
          const state = withDynamicVisible(
            groupedControl([
              groupedControl([
                dataControl(schema.field, undefined, { required: true }),
              ]),
            ]),
            schema,
            data,
            vis,
          );
          expect(state.valid).toBe(true);
          state.parent.control.value = {};
          expect(state.valid).toBe(!initialVisible);
          vis.setValue((x) => !x);
          expect(state.valid).toBe(initialVisible);
        },
      ),
    );
  });
});

function withDynamicVisible(
  c: ControlDefinition,
  schema: SchemaField,
  data: any,
  vis: Control<boolean>,
): FormStateNode {
  const state = testNodeState(
    {
      ...c,
      dynamic: [
        { type: DynamicPropertyType.Visible, expr: { type: "Anything" } },
      ],
    },
    schema,
    {
      data,
      evalExpression: (e, ctx) => {
        if (e.type === "Anything") {
          createSyncEffect(() => {
            ctx.returnResult(vis.value);
          }, ctx.scope);
        } else {
          defaultEvaluators[e.type]?.(e, ctx);
        }
      },
    },
  );
  return state;
}
