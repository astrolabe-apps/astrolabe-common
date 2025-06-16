import { describe, it } from "@jest/globals";
import fc from "fast-check";
import { arbitraryControl } from "./gen";
import { testNodeState } from "./nodeTester";
import { DynamicPropertyType } from "../src";

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
                expr: { type: "" },
              },
            ],
          },
          (_, ctx) => {
            console.log("custom eval")
              ctx.returnResult(!hidden);
          },
        );
        console.log(hidden, firstChild.hidden);
        return !!(firstChild.hidden && firstChild.definition.hidden) === hidden;
      }),
    );
  });
});
