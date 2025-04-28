import {
  addDependent,
  CleanupScope,
  Control, ControlSetup,
  newControl,
  updateComputedValue
} from "@astroapps/controls";

/**
 * Type representing a JSON path, which can be a string or a number.
 */
export type JsonPath = string | number;

/**
 * Converts a JSON path array to a string.
 * @param jsonPath - The JSON path array to convert.
 * @param customIndex - Optional function to customize the index format.
 * @returns The JSON path string.
 */
export function jsonPathString(
  jsonPath: JsonPath[],
  customIndex?: (n: number) => string,
) {
  let out = "";
  jsonPath.forEach((v, i) => {
    if (typeof v === "number") {
      out += customIndex?.(v) ?? "[" + v + "]";
    } else {
      if (i > 0) out += ".";
      out += v;
    }
  });
  return out;
}

export function createScopedComputed<T>(
  parent: CleanupScope,
  compute: () => T,
): Control<T> {
  const c = newControl<any>(undefined);
  updateComputedValue(c, compute);
  addDependent(parent, c);
  return c.as();
}

export function createScoped<T>(parent: CleanupScope, value: T, setup?: ControlSetup<T>): Control<T> {
  const c = newControl<T>(value, setup);
  addDependent(parent, c);
  return c;
}
