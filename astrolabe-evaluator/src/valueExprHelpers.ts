import { Path, ValueExpr, ValueExprValue } from "./ast";
import { ComputedValueExpr, ControlBackedValueExpr } from "./reactiveValueExpr";

/**
 * Create a new ValueExpr with a different value.
 * Always returns a plain object (breaks reactivity).
 * Use this when the value is fundamentally different from the source.
 */
export function withValue(
  expr: ValueExpr,
  newValue: ValueExprValue,
): ValueExpr {
  return {
    type: "value",
    value: newValue,
    path: expr.path,
    location: expr.location,
    // Note: Does NOT preserve deps or function - new value breaks reactivity
  };
}

/**
 * Create a new ValueExpr with a different path.
 * Preserves reactivity if the source is reactive.
 */
export function withPath(expr: ValueExpr, path: Path | undefined): ValueExpr {
  if (expr instanceof ComputedValueExpr) {
    return new ComputedValueExpr(
      expr.getControl(),
      path,
      expr.location,
    );
  } else if (expr instanceof ControlBackedValueExpr) {
    return new ControlBackedValueExpr(
      expr.getControl(),
      path,
      expr.location,
      expr.deps,
    );
  }
  // Static: Create new POJO
  return {
    ...expr,
    path,
  };
}

/**
 * Create a new ValueExpr with different dependencies.
 * Preserves reactivity if the source is reactive.
 * Note: ComputedValueExpr gets deps from its Control, so this only works for static/ControlBacked.
 */
export function withDeps(expr: ValueExpr, deps: ValueExpr[] | undefined): ValueExpr {
  if (expr instanceof ComputedValueExpr) {
    // ComputedValueExpr deps come from the Control, can't override them
    // Return the expr as-is
    return expr;
  } else if (expr instanceof ControlBackedValueExpr) {
    return new ControlBackedValueExpr(
      expr.getControl(),
      expr.path,
      expr.location,
      deps,
    );
  }
  // Static: Create new POJO
  return {
    ...expr,
    deps,
  };
}
