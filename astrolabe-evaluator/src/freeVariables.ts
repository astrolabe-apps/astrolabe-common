import { EvalExpr } from "./ast";

/**
 * Find all free (unbound) variable references in an expression.
 * Function names are not counted. Let is recursive, so every binding of a let
 * sees every other binding and itself; lambda parameters are bound in the body.
 *
 * @param expr - The expression to analyse
 * @param bound - Variables already bound by an enclosing scope
 * @returns The names of the free variables, without the leading $
 */
export function freeVariables(
  expr: EvalExpr,
  bound: Set<string> = new Set(),
): Set<string> {
  const free = new Set<string>();
  visit(expr, bound);
  return free;

  function visit(e: EvalExpr, boundVars: Set<string>): void {
    switch (e.type) {
      case "var":
        if (!boundVars.has(e.variable)) free.add(e.variable);
        return;
      case "value":
      case "property":
        return;
      case "call":
        e.args.forEach((a) => visit(a, boundVars));
        return;
      case "array":
        e.values.forEach((v) => visit(v, boundVars));
        return;
      case "let": {
        const newBound = new Set(boundVars);
        e.variables.forEach(([v]) => newBound.add(v.variable));
        e.variables.forEach(([, b]) => visit(b, newBound));
        visit(e.expr, newBound);
        return;
      }
      case "lambda":
        visit(e.expr, new Set(boundVars).add(e.variable));
        return;
    }
  }
}
