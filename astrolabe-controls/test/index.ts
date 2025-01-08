import { ControlChange } from "../src";
import { expect } from "@jest/globals";

export function expectChanges(
  changes: ControlChange[],
  expected: ControlChange[],
) {
  expect(changes).toStrictEqual(expected);
  changes.length = 0;
}
