import { ValueExpr, Path, EvalEnv } from "./ast";
import { printPath } from "./printExpr";
import { withValue, withDeps } from "./valueExprHelpers";

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
  additionalDeps: Path[],
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
    return withDeps(valueExpr, combinedDeps);
  }

  // It's an array - recursively add deps to each element
  const newElements = valueExpr.value.map((elem) =>
    addDepsRecursively(elem, additionalDeps),
  );
  // Creating new value with transformed array - breaks reactivity intentionally
  return {
    type: "value",
    value: newElements,
    deps: combinedDeps,
    path: valueExpr.path,
    location: valueExpr.location,
  };
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [v];
}

export function valuesToString(
  env: EvalEnv,
  value: ValueExpr[],
  after: (s: string) => string,
): ValueExpr {
  return env.computeValueExpr(
    () => {
      const allVals = value.map((v) => toString(env, v));
      return [after(allVals.map((x) => x.value).join("")), value];
    },
    undefined,
  );
}

export function toString(env: EvalEnv, value: ValueExpr): ValueExpr {
  const v = value.value;
  if (typeof v === "object") {
    if (Array.isArray(v)) return valuesToString(env, v, (x) => x);
    if (v == null) return withValue(value, "null");
    return withValue(value, JSON.stringify(v));
  }
  return withValue(value, singleString());
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
