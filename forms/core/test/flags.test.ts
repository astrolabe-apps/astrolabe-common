import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { arbitraryData, schemaAndControl } from "./gen";
import { allChildren, testNodeState } from "./nodeTester";
import {
  ControlDefinition,
  dataControl,
  DynamicPropertyType,
  isControlReadonly,
} from "../src";
import { randomValueForField, rootCompound } from "./gen-schema";

describe("form state flags", () => {
  it("static hidden on all definitions", () => {
    fc.assert(
      fc.property(schemaAndControl(), fc.boolean(), (c, hidden) => {
        const firstChild = testNodeState({ ...c.control, hidden }, c.schema);
        return allChildren(firstChild).every((x) => x.hidden === hidden);
      }),
    );
  });

  it("context hidden on all definitions", () => {
    fc.assert(
      fc.property(schemaAndControl(), fc.boolean(), (c, hidden) => {
        const firstChild = testNodeState(c.control, c.schema, {
          contextOptions: { hidden },
        });
        return allChildren(firstChild).every(
          (x) => !x.definition.hidden && x.hidden === hidden,
        );
      }),
    );
  });

  it("static disabled on all definitions", () => {
    fc.assert(
      fc.property(schemaAndControl(), fc.boolean(), (c, disabled) => {
        const firstChild = testNodeState({ ...c.control, disabled }, c.schema);
        return allChildren(firstChild).every((x) => x.disabled === disabled);
      }),
    );
  });

  it("context disabled on all definitions", () => {
    fc.assert(
      fc.property(schemaAndControl(), fc.boolean(), (c, disabled) => {
        const firstChild = testNodeState(c.control, c.schema, {
          contextOptions: { disabled },
        });
        return allChildren(firstChild).every((x) => x.disabled === disabled);
      }),
    );
  });

  it("dynamic hidden on all definitions", () => {
    fc.assert(
      fc.property(schemaAndControl(), fc.boolean(), (c, hidden) => {
        const firstChild = testNodeState(
          withDynamic(c.control, DynamicPropertyType.Visible),
          c.schema,
          { evalExpression: (_, ctx) => ctx.returnResult(!hidden) },
        );
        return (
          !!firstChild.definition.hidden === hidden &&
          allChildren(firstChild).every((x) => x.hidden === hidden)
        );
      }),
    );
  });

  it("dynamic disabled on all definitions", () => {
    fc.assert(
      fc.property(schemaAndControl(), fc.boolean(), (c, disabled) => {
        const firstChild = testNodeState(
          withDynamic(c.control, DynamicPropertyType.Disabled),
          c.schema,
          { evalExpression: (_, ctx) => ctx.returnResult(disabled) },
        );
        return (
          !!firstChild.definition.disabled === disabled &&
          allChildren(firstChild).every((x) => x.disabled === disabled)
        );
      }),
    );
  });

  it("dynamic readonly on data definitions", () => {
    fc.assert(
      fc.property(schemaAndControl(), fc.boolean(), (c, readonly) => {
        const firstChild = testNodeState(
          withDynamic(c.control, DynamicPropertyType.Readonly),
          c.schema,
          { evalExpression: (_, ctx) => ctx.returnResult(readonly) },
        );
        return (
          !!firstChild.definition.readonly === readonly &&
          allChildren(firstChild).every((x) => x.readonly === readonly)
        );
      }),
    );
  });

  it("array nodes get cleaned up when removed", () => {
    fc.assert(
      fc.property(
        rootCompound({
          forceArray: true,
          notNullable: true,
        }).chain(([root, first]) =>
          fc.record({
            schema: fc.constant(first),
            data: randomValueForField(root),
          }),
        ),
        (c) => {
          let cleanUpsAdded = 0;
          const firstChild = testNodeState(
            dataControl(c.schema.field, undefined, {
              children: [
                withDynamic(dataControl("."), DynamicPropertyType.Label),
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

function withDynamic(
  c: ControlDefinition,
  type: DynamicPropertyType,
): ControlDefinition {
  return { ...c, dynamic: [{ type, expr: { type: "Anything" } }] };
}
