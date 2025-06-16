import { describe, it } from "@jest/globals";
import fc from "fast-check";
import { arbitraryControl, arbitraryData } from "./gen";
import { testNodeState } from "./nodeTester";
import { DynamicPropertyType, isControlReadonly } from "../src";

describe("hidden", () => {
  it("static hidden on all definitions", () => {
    fc.assert(
      fc.property(arbitraryControl, fc.boolean(), (c, hidden) => {
        const firstChild = testNodeState({ ...c, hidden });
        return !!(firstChild.hidden && firstChild.definition.hidden) === hidden;
      }),
    );
  });

  it("static disabled on all definitions", () => {
    fc.assert(
      fc.property(arbitraryControl, fc.boolean(), (c, disabled) => {
        const firstChild = testNodeState({ ...c, disabled });
        return (
          !!(firstChild.disabled && firstChild.definition.disabled) === disabled
        );
      }),
    );
  });

  it("dynamic hidden on all definitions", () => {
    fc.assert(
      fc.property(arbitraryControl, fc.boolean(), (c, hidden) => {
        const firstChild = testNodeState(
          {
            ...c,
            dynamic: [
              {
                type: DynamicPropertyType.Visible,
                expr: { type: "Anything" },
              },
            ],
          },
          (_, ctx) => ctx.returnResult(!hidden),
        );
        return !!(firstChild.hidden && firstChild.definition.hidden) === hidden;
      }),
    );
  });

  it("dynamic disabled on all definitions", () => {
    fc.assert(
      fc.property(arbitraryControl, fc.boolean(), (c, disabled) => {
        const firstChild = testNodeState(
          {
            ...c,
            dynamic: [
              {
                type: DynamicPropertyType.Disabled,
                expr: { type: "Anything" },
              },
            ],
          },
          (_, ctx) => ctx.returnResult(disabled),
        );
        return (
          !!(firstChild.disabled && firstChild.definition.disabled) === disabled
        );
      }),
    );
  });

  it("dynamic readonly on all definitions", () => {
    fc.assert(
      fc.property(arbitraryData(), fc.boolean(), (c, readonly) => {
        const firstChild = testNodeState(
          {
            ...c,
            dynamic: [
              {
                type: DynamicPropertyType.Readonly,
                expr: { type: "Anything" },
              },
            ],
          },
          (_, ctx) => ctx.returnResult(readonly),
        );
        return (
          !!(
            firstChild.readonly && isControlReadonly(firstChild.definition)
          ) === readonly
        );
      }),
    );
  });
});
