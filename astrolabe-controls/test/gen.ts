import fc, { Arbitrary, JsonValue } from "fast-check";
import { Control } from "../src";
import { newControl } from "../src";
import { JsonObject } from "fast-check/lib/types/arbitrary/_internals/helpers/JsonConstraintsBuilder";

type JsonPath = (string | number)[];

type JsonAndChild = { json: JsonValue; child: JsonPath };

function hasChild(v: JsonValue): boolean {
  return (
    (Array.isArray(v) && v.length > 0) ||
    (typeof v === "object" && v != null && Object.keys(v).length > 0)
  );
}

export function getParentAndChild(
  jsonAndChild: JsonAndChild,
): [Control<JsonValue>, Control<JsonValue>] {
  const { json, child } = jsonAndChild;
  const parent = newControl(json);
  let current = parent;
  let i = 0;
  while (i < child.length) {
    const p = child[i];
    if (typeof p === "number") current = current.as<JsonValue[]>().elements[p];
    else current = current.fields[p].as();
    i++;
  }
  return [parent, current];
}

function randomChild(
  v: JsonValue,
  path: JsonPath,
  chanceOfSelf: number = 0,
): Arbitrary<JsonPath> {
  return fc.integer({ min: 0, max: 100 }).chain((selfNum) => {
    if (chanceOfSelf <= selfNum) {
      if (Array.isArray(v)) {
        if (v.length > 0)
          return fc
            .integer({ min: 0, max: v.length - 1 })
            .chain((x) => randomChild(v[x], [...path, x], 75));
      } else if (
        typeof v === "object" &&
        v != null &&
        Object.keys(v).length > 0
      ) {
        const k = Object.keys(v);
        return fc
          .integer({ min: 0, max: k.length - 1 })
          .chain((x) => randomChild(v[k[x]]!, [...path, k[x]], 75));
      }
    }
    return fc.constant(path);
  });
}
export const arbitraryParentChild = fc
  .jsonValue()
  .filter(hasChild)
  .chain((v) => {
    return randomChild(v, []).map(
      (c) => ({ json: v, child: c }) satisfies JsonAndChild,
    );
  });
