import { ValueExpr, valueExprWithDeps, Path } from "./ast";
import { printPath } from "./printExpr";

/**
 * Extract all elements from nested arrays, adding parent deps at extraction time.
 * This implements lazy deps propagation - children get parent deps when extracted,
 * not when the parent is created.
 *
 * @param v The ValueExpr to extract elements from
 * @param parent Optional parent ValueExpr - if it has deps, they'll be added to extracted children
 */
export function allElems(v: ValueExpr, parent?: ValueExpr): ValueExpr[] {
  if (Array.isArray(v.value)) {
    // Recurse into nested arrays, passing v as the parent
    return v.value.flatMap(child => allElems(child, v));
  }

  // Leaf element - add parent as dep if parent has deps
  if (parent?.deps && parent.deps.length > 0) {
    return [{ ...v, deps: [...(v.deps || []), parent] }];
  }

  return [v];
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
