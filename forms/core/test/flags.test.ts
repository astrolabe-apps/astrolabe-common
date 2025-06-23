import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { schemaAndControl } from "./gen";
import { allChildren, testNodeState, withDynamic } from "./nodeTester";
import { dataControl, DynamicPropertyType, groupedControl } from "../src";
import { rootCompound } from "./gen-schema";

describe("form state flags", () => {
  it("static hidden on all definitions", () => {
    fc.assert(
      fc.property(schemaAndControl(), fc.boolean(), (c, hidden) => {
        const firstChild = testNodeState({ ...c.control, hidden }, c.schema);
        return allChildren(firstChild).every((x) => x.visible === !hidden);
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
          (x) => !x.definition.hidden && x.visible === !hidden,
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
          allChildren(firstChild).every((x) => x.visible === !hidden)
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

  it("touched flag flows through to children", () => {
    fc.assert(
      fc.property(schemaAndControl(), (c) => {
        const firstChild = testNodeState(groupedControl([c.control]), c.schema);
        expect(firstChild.touched).toBe(false);
        firstChild.setTouched(true);
        allChildren(firstChild).forEach((x) => expect(x.touched).toBe(true));
        firstChild.setTouched(false);
        allChildren(firstChild).forEach((x) => expect(x.touched).toBe(false));
      }),
    );
  });

  it("touched flag syncs with control", () => {
    fc.assert(
      fc.property(
        rootCompound().map((x) => x.schema),
        (schema) => {
          const firstChild = testNodeState(
            groupedControl([dataControl(schema.field)]),
            schema,
          );
          const dataChild = firstChild.children[0];
          const childControl = dataChild.dataNode!;
          expect(firstChild.touched).toBe(false);
          firstChild.setTouched(true);
          allChildren(firstChild).forEach((x) => expect(x.touched).toBe(true));
          expect(childControl.control.touched).toBe(true);
          childControl.control.touched = true;
          expect(dataChild.touched).toBe(true);
          childControl.control.touched = false;
          expect(dataChild.touched).toBe(false);
        },
      ),
    );
  });
});
