import { ValueExpr } from "./ast";

export function allElems(v: ValueExpr): ValueExpr[] {
  if (Array.isArray(v.value)) return v.value.flatMap(allElems);
  return [v];
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [v];
}

export function toString(v: unknown): string {
  switch (typeof v) {
    case "string":
      return v;
    case "boolean":
      return v ? "true" : "false";
    case "undefined":
      return "null";
    case "object":
      if (Array.isArray(v)) return v.map((x) => toString(x.value)).join("");
      if (v == null) return "null";
      return JSON.stringify(v);
    default:
      return (v as any).toString();
  }
}
