import fc, { Arbitrary, JsonValue } from "fast-check";
import { Control } from "../src/lib/types";
import { createControlContext } from "../src/lib/controlContextImpl";
import { lookupControl } from "../src/lib/controlUtils";

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
  const ctx = createControlContext();
  const { json, child } = jsonAndChild;
  const parent = ctx.newControl(json);
  const found = lookupControl(parent, child);
  return [parent, found!];
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

export const arrayAndIndex: Arbitrary<[string[], number]> = fc
  .array(fc.string(), { minLength: 1 })
  .chain((x) =>
    fc.tuple(fc.constant(x), fc.integer({ min: 0, max: x.length - 1 })),
  );