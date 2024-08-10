import { CallExpr, EvalExpr, Path, ValueExpr } from "./ast";

export function printExpr(expr: EvalExpr): string {
  switch (expr.type) {
    case "array":
      return "[" + expr.values.map(printExpr).join(", ") + "]";
    case "lambda":
      return `\$${expr.variable} => ${printExpr(expr.expr)}`;
    case "value":
      return printValue(expr);
    case "property":
      return expr.property;
    case "call":
      return printCall(expr);
    case "var":
      return `\$${expr.variable}`;
    case "let":
      if (expr.variables.length == 0) return printExpr(expr.expr);
      return `let ${expr.variables.map((x) => "$" + x[0] + ":=" + printExpr(x[1]))} in ${printExpr(expr.expr)}`;
  }
}

export function printValue({ value }: ValueExpr) {
  if (value == null) return "null";
  switch (typeof value) {
    case "string":
      return `"${value}"`;
    default:
      return value.toString();
  }
}

export function printCall(call: CallExpr) {
  const args = call.args;
  switch (call.function) {
    case ".":
      return `${printExpr(args[0])}.${printExpr(args[1])}`;
    case "[":
      return `${printExpr(args[0])}[${printExpr(args[1])}]`;
    case "+":
    case "-":
    case "*":
    case "/":
    case "=":
    case "!=":
    case "<":
    case ">":
    case ">=":
    case "<=":
    case "and":
    case "or":
      return `${printExpr(args[0])} ${call.function} ${printExpr(args[1])}`;
    default:
      return `\$${call.function}(${args.map(printExpr).join(", ")})`;
  }
}
export function printPath(path: Path): string {
  if (path.segment != null) {
    if (path.parent.segment == null) return path.segment.toString();
    return printPath(path.parent) + "." + path.segment;
  } else return "";
}
