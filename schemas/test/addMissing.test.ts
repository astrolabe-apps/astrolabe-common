import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { randomSchemaField } from "./gen";
import { addMissingControls } from "../src";

describe("addMissing", () => {
  it("new control added for missing node, no control added if already there", () => {
    fc.assert(
      fc.property(randomSchemaField({ compoundChance: 0 }), (fv) => {
        const controls = addMissingControls([fv], []);
        expect(controls).toHaveLength(1);
        expect(addMissingControls([fv], controls)).toHaveLength(1);
      }),
    );
  });
});
