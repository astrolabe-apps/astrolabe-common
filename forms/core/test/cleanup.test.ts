import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { randomValueForField, rootCompound } from "./gen-schema";
import { testNodeState, withDynamic, withScript } from "./nodeTester";
import { dataControl, DynamicPropertyType, groupedControl } from "../src";

describe("resource cleanup", () => {
  it("array nodes get cleaned up when removed", () => {
    fc.assert(
      fc.property(
        rootCompound({
          forceArray: true,
          notNullable: true,
        }).chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        (c) => {
          let cleanUpsAdded = 0;
          const firstChild = testNodeState(
            dataControl(c.schema.field, undefined, {
              children: [
                groupedControl([
                  withDynamic(dataControl("."), DynamicPropertyType.Label),
                ]),
              ],
            }),
            c.schema,
            {
              data: c.data,
              evalExpression: (e, ctx) => {
                cleanUpsAdded++;
                ctx.scope.addCleanup(() => cleanUpsAdded--);
              },
            },
          );
          expect(cleanUpsAdded).toBe(firstChild.children.length);
          firstChild.dataNode!.control.value = [];
          return expect(cleanUpsAdded).toBe(0);
        },
      ),
    );
  });

  it("array nodes get cleaned up when removed (scripts)", () => {
    fc.assert(
      fc.property(
        rootCompound({
          forceArray: true,
          notNullable: true,
        }).chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        (c) => {
          let cleanUpsAdded = 0;
          const firstChild = testNodeState(
            dataControl(c.schema.field, undefined, {
              children: [
                groupedControl([withScript(dataControl("."), "title")]),
              ],
            }),
            c.schema,
            {
              data: c.data,
              evalExpression: (e, ctx) => {
                cleanUpsAdded++;
                ctx.scope.addCleanup(() => cleanUpsAdded--);
              },
            },
          );
          expect(cleanUpsAdded).toBe(firstChild.children.length);
          firstChild.dataNode!.control.value = [];
          return expect(cleanUpsAdded).toBe(0);
        },
      ),
    );
  });
});
