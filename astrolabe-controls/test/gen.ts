import fc, { Arbitrary, JsonValue } from "fast-check";
import { Control, ControlChange, ControlProperties, newControl } from "../src";

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

export const arrayAndIndex: Arbitrary<[string[], number]> = fc
  .array(fc.string(), { minLength: 1 })
  .chain((x) =>
    fc.tuple(fc.constant(x), fc.integer({ min: 0, max: x.length - 1 })),
  );

export interface ChangeAndTrigger {
  change: ControlChange;
  trigger: (cp: ControlProperties<any>) => void;
}

export const arbitraryChangeAndTrigger: Arbitrary<ChangeAndTrigger> =
  fc.constantFrom(
    { change: ControlChange.Value, trigger: (p) => p.value },
    { change: ControlChange.InitialValue, trigger: (p) => p.initialValue },
    { change: ControlChange.Structure, trigger: (p) => p.isNull },
    { change: ControlChange.Dirty, trigger: (p) => p.dirty },
    { change: ControlChange.Valid, trigger: (p) => p.valid },
    { change: ControlChange.Error, trigger: (p) => p.errors },
    { change: ControlChange.Error, trigger: (p) => p.error },
    { change: ControlChange.Touched, trigger: (p) => p.touched },
    { change: ControlChange.Disabled, trigger: (p) => p.disabled },
  );
