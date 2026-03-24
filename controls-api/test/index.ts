import { ControlChange, ControlContext } from "../src/lib/types";
import { createControlContext } from "../src/lib/controlContextImpl";
import { expect } from "@jest/globals";

export function expectChanges(
  changes: ControlChange[],
  expected: ControlChange[],
) {
  expect(changes).toStrictEqual(expected);
  changes.length = 0;
}

export function makeCtx(): ControlContext {
  return createControlContext();
}
