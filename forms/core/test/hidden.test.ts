import { describe, it } from "@jest/globals";
import fc from "fast-check";
import { arbitraryControl } from "./gen";
import { testNodeState } from "./nodeTester";

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
});
