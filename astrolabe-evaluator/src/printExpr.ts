import { EvalExpr, Path } from "./nodes";

export function printExpr(expr: EvalExpr): string {
  switch (expr.type) {
    case "array":
      return "[" + expr.values.map(printExpr).join(", ") + "]";
    case "lambda":
      return `\$${expr.variable} => ${printExpr(expr.expr)}`;
    case "value":
      return expr.value?.toString() ?? "null";
    case "path":
      return printPath(expr.path);
    case "call":
      return `\$${expr.function}(${expr.args.map(printExpr).join(", ")})`;
    case "var":
      return `\$${expr.variable}`;
    case "let":
      return `let ${expr.variables.map((x) => "$" + x[0] + "=" + printExpr(x[1]))} in ${printExpr(expr.expr)}`;
    case "func":
      return "INTERNAL";
    default:
      return expr.type;
  }
}

function printPath(path: Path): string {
  if (path.segment != null) return printPath(path.parent) + "." + path.segment;
  else return "";
}
