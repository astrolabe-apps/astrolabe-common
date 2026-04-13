import { CallExpr, EvalExpr, Path, ValueExpr } from "./ast";

// Operator precedence levels (higher number = higher precedence)
const PRECEDENCE = {
  ternary: 1,    // ? :
  or: 2,         // or
  and: 3,        // and
  rel: 4,        // <, >, =, !=, <=, >=
  plus: 5,       // +, -
  times: 6,      // *, /, %
  map: 7,        // .
  filter: 8,     // [...]
  prefix: 9,     // unary !, +, -
  call: 10,      // function calls
};

function getPrecedence(expr: EvalExpr): number {
  if (expr.type === "call") {
    switch (expr.function) {
      case "?": return PRECEDENCE.ternary;
      case "or": return PRECEDENCE.or;
      case "and": return PRECEDENCE.and;
      case "<":
      case ">":
      case "=":
      case "!=":
      case "<=":
      case ">=": return PRECEDENCE.rel;
      case "+":
      case "-": return PRECEDENCE.plus;
      case "*":
      case "/":
      case "%": return PRECEDENCE.times;
      case ".": return PRECEDENCE.map;
      case "[": return PRECEDENCE.filter;
      case "??": return PRECEDENCE.or; // default operator, similar precedence to or
      default: return PRECEDENCE.call;
    }
  }
  return PRECEDENCE.call; // atoms have highest precedence
}

function printWithParens(expr: EvalExpr, parentPrecedence: number): string {
  const exprPrecedence = getPrecedence(expr);
  const needsParens = exprPrecedence < parentPrecedence;
  const printed = printExpr(expr);
  return needsParens ? `(${printed})` : printed;
}

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
      return `let ${expr.variables.map((x) => "$" + x[0].variable + " := " + printExpr(x[1])).join(", ")} in ${printExpr(expr.expr)}`;
  }
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\x08/g, "\\b")  // backspace character (not word boundary!)
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v");
}

export function printValue({ value }: ValueExpr): string {
  if (value == null) return "null";
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "string") return `"${escapeString(value)}"`;
  if (typeof value === "number") return value.toString();

  // Handle arrays
  if (Array.isArray(value)) {
    return `[${value.map(v => printExpr(v)).join(", ")}]`;
  }

  // Handle objects (Record<string, ValueExpr>)
  if (typeof value === "object") {
    const objValue = value as Record<string, ValueExpr>;
    const entries = Object.entries(objValue);
    if (entries.length === 0) return "{}";

    const pairs = entries.map(([key, val]) =>
      `"${escapeString(key)}": ${printExpr(val)}`
    );
    return `{${pairs.join(", ")}}`;
  }

  // Fallback for any unexpected types
  return String(value);
}

export function printCall(call: CallExpr) {
  const args = call.args;
  const precedence = getPrecedence(call);

  switch (call.function) {
    case ".":
      return `${printWithParens(args[0], precedence)}.${printExpr(args[1])}`;
    case "[":
      return `${printWithParens(args[0], precedence)}[${printExpr(args[1])}]`;
    case "?":
      // Ternary is right-associative, so we need special handling
      return `${printWithParens(args[0], precedence + 1)} ? ${printWithParens(args[1], precedence)} : ${printWithParens(args[2], precedence)}`;
    case "object":
      // Object literals: $object("key1", value1, "key2", value2, ...) => {key1: value1, key2: value2, ...}
      if (args.length % 2 === 0) {
        const pairs: string[] = [];
        for (let i = 0; i < args.length; i += 2) {
          const key = args[i];
          const value = args[i + 1];
          // Print the key as-is to preserve whether it's a string literal or identifier
          pairs.push(`${printExpr(key)}: ${printExpr(value)}`);
        }
        return `{${pairs.join(", ")}}`;
      }
      return `\$${call.function}(${args.map(printExpr).join(", ")})`;
    case "string":
      // Template strings: $string("hello ", expr, " world") => `hello {expr} world`
      // Note: This language uses {expr} for interpolations, not ${expr}
      if (args.length > 1) {
        let result = "`";
        for (const arg of args) {
          if (arg.type === "value" && typeof arg.value === "string") {
            // Escape backticks and backslashes in template strings
            result += arg.value
              .replace(/\\/g, "\\\\")
              .replace(/`/g, "\\`");
          } else {
            result += "{" + printExpr(arg) + "}";
          }
        }
        result += "`";
        return result;
      }
      return `\$${call.function}(${args.map(printExpr).join(", ")})`;
    case "+":
    case "-":
    case "*":
    case "/":
    case "%":
    case "=":
    case "!=":
    case "<":
    case ">":
    case ">=":
    case "<=":
    case "and":
    case "or":
    case "??":
      // Left-associative operators: left operand needs parens if lower precedence,
      // right operand needs parens if lower or equal precedence
      return `${printWithParens(args[0], precedence)} ${call.function} ${printWithParens(args[1], precedence + 1)}`;
    default:
      return `\$${call.function}(${args.map(printExpr).join(", ")})`;
  }
}
export function printPath(path: Path): string {
  if (path.segment != null) {
    const parentStr = printPath(path.parent);
    if (typeof path.segment === "number") {
      // Index access uses bracket notation: [0]
      return `${parentStr}[${path.segment}]`;
    } else {
      // Field access uses dot notation: .field or just field at root
      return parentStr ? `${parentStr}.${path.segment}` : path.segment;
    }
  } else return "";
}
