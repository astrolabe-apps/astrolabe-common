import { ValueExpr, valueExprWithDeps } from "./ast";
import { printPath } from "./printExpr";

export function allElems(v: ValueExpr): ValueExpr[] {
  if (Array.isArray(v.value)) return v.value.flatMap(allElems);
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
