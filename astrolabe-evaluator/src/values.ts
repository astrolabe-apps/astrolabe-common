import { ValueExpr, valueExprWithDeps, Path } from "./ast";
import { printPath } from "./printExpr";

export function allElems(v: ValueExpr): ValueExpr[] {
  if (Array.isArray(v.value)) return v.value.flatMap(allElems);
  return [v];
}

/**
 * Recursively adds dependencies to a ValueExpr and all nested array elements.
 * This ensures that when flatmap flattens nested arrays, the dependencies are preserved.
 */
export function addDepsRecursively(
  valueExpr: ValueExpr,
  additionalDeps: ValueExpr[],
): ValueExpr {
  if (additionalDeps.length === 0) {
    return valueExpr;
  }

  const combinedDeps = [
    ...(valueExpr.deps || []),
    ...additionalDeps,
  ];

  if (!Array.isArray(valueExpr.value)) {
    // Not an array, just add deps to this value
    return { ...valueExpr, deps: combinedDeps };
  }

  // It's an array - recursively add deps to each element
  const newElements = valueExpr.value.map((elem) =>
    addDepsRecursively(elem, additionalDeps),
  );
  return { ...valueExpr, value: newElements, deps: combinedDeps };
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [v];
}

export function valuesToString(
  value: ValueExpr[],
  after: (s: string) => string,
): ValueExpr {
  const allVals = value.map(toString);
  return valueExprWithDeps(
    after(allVals.map((x) => x.value).join("")),
    allVals,
  );
}

export function toString(value: ValueExpr): ValueExpr {
  const v = value.value;
  if (typeof v === "object") {
    if (Array.isArray(v)) return valuesToString(v, (x) => x);
    if (v == null) return { ...value, value: "null" };
    return { ...value, value: JSON.stringify(v) };
  }
  return { ...value, value: singleString() };
  function singleString() {
    switch (typeof v) {
      case "string":
        return v;
      case "boolean":
        return v ? "true" : "false";
      case "undefined":
        return "null";
      default:
        return (v as any).toString();
    }
  }
}
