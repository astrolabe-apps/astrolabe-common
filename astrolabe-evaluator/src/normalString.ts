import { EvalExpr } from "./ast";

// Typescript port of NormalString.cs from Astrolabe.Evaluator
class ParseResult<T> {
  constructor(
    public remaining: string,
    public result: T,
  ) {}
  map<T2>(func: (t: T) => T2): ParseResult<T2> {
    return new ParseResult(this.remaining, func(this.result));
  }
}

type EscapeChars = {
  replacements: Record<string, string>;
  reverse: Record<string, string>;
  stops: string[];
};

const Commas = makeEscape({ ",": "c" });
const CommaArg = makeEscape({ ",": "c", ")": "b" });
const CommaLet = makeEscape({ ",": "c" });
const Quote = makeEscape({ '"': "q" });
const Single = makeEscape({ "'": "s" });
const Dollar = makeEscape({ $: "d" });
const NumberChars = "0123456789.-Ee+".split(""); // JS numbers have 'e' instead of 'E' errggh

function makeEscape(escapes: Record<string, string>): EscapeChars {
  const reverse: Record<string, string> = {};
  Object.entries(escapes).forEach(([k, v]) => (reverse[v] = k));
  return { replacements: escapes, reverse, stops: Object.keys(escapes) };
}

function unescape(
  source: string,
  escapes: EscapeChars,
  dontConsume = false,
): ParseResult<string> {
  let endIndex = -1;
  for (let i = 0; i < source.length; i++) {
    if (escapes.stops.includes(source[i])) {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) endIndex = source.length;
  let result = "";
  let prvEscape = false;
  let offset = 0;
  while (offset < endIndex) {
    const ch = source[offset++];
    const isEscape = ch === "\\";
    if (prvEscape) {
      result += isEscape ? ch : escapes.reverse[ch] || ch;
      prvEscape = false;
    } else if (isEscape) {
      prvEscape = true;
    } else {
      result += ch;
    }
  }
  const remaining = dontConsume
    ? source.slice(endIndex)
    : source.slice(endIndex + 1);
  return new ParseResult(remaining, result);
}

function parseNum(source: string, fp: boolean): ParseResult<EvalExpr> {
  let numberEnd = -1;
  for (let i = 0; i < source.length; i++) {
    if (!NumberChars.includes(source[i])) {
      numberEnd = i;
      break;
    }
  }
  if (numberEnd === -1) numberEnd = source.length;
  const numSpan = source.slice(0, numberEnd);
  const remaining = source.slice(numberEnd);
  const value = fp ? parseFloat(numSpan) : parseInt(numSpan, 10);
  return new ParseResult(remaining, { type: "value", value });
}

function parseAssignment(source: string): ParseResult<[string, EvalExpr]> {
  const nameResult = unescape(source, CommaLet);
  const varName = nameResult.result;
  const exprResult = parse(nameResult.remaining);
  return exprResult.map((x) => [varName, x]);
}

function parseWhile<T>(
  source: string,
  single: (src: string) => ParseResult<T>,
): ParseResult<T[]> {
  const elems: T[] = [];
  let s = source;
  while (s[0] === ",") {
    const next = single(s.slice(1));
    elems.push(next.result);
    s = next.remaining;
  }
  return new ParseResult(s.slice(1), elems);
}

export function parse(source: string): ParseResult<EvalExpr> {
  if (source.length === 0) throw new Error("Source cannot be empty");
  const ch = source[0];
  const next = source.slice(1);
  switch (ch) {
    case '"':
      return unescape(next, Quote).map((x) => ({ type: "value", value: x }));
    case "=": {
      const assignRes = parseWhile(next, parseAssignment);
      const inRes = parse(assignRes.remaining);
      return inRes.map((i) => ({
        type: "let",
        variables: assignRes.result,
        expr: i,
      }));
    }
    case "[":
      return parseWhile(next, parse).map((i) => ({ type: "array", values: i }));
    case "'":
      return unescape(next, Single).map((x) => ({
        type: "property",
        property: x,
      }));
    case "\\": {
      const varRes = unescape(next, Commas);
      const exprRes = parse(varRes.remaining);
      return exprRes.map((x) => ({
        type: "lambda",
        variable: varRes.result,
        expr: x,
      }));
    }
    case "(": {
      const funcRes = unescape(next, CommaArg, true);
      const argsRes = parseWhile(funcRes.remaining, parse);
      return argsRes.map((r) => ({
        type: "call",
        function: funcRes.result,
        args: r,
      }));
    }
    case "$":
      return unescape(next, Dollar).map((s) => ({ type: "var", variable: s }));
    case "t":
      return new ParseResult(next, { type: "value", value: true });
    case "f":
      return new ParseResult(next, { type: "value", value: false });
    case "n":
      return new ParseResult(next, { type: "value", value: null });
    case "d":
      return parseNum(next, true);
    default:
      if (/^-?\d/.test(source)) return parseNum(source, false);
      throw new Error(`Unknown NormalString type: ${ch}`);
  }
}

function escape(s: string, escapes: EscapeChars): string {
  let result = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\") {
      result += "\\";
      result += "\\";
    } else if (escapes.replacements[ch]) {
      result += "\\";
      result += escapes.replacements[ch];
    } else {
      result += ch;
    }
  }
  return result;
}

export function toNormalString(expr: EvalExpr): string {
  switch (expr.type) {
    case "array":
      return (
        "[" + expr.values.map((x) => "," + toNormalString(x)).join("") + "]"
      );
    case "call":
      return (
        `(${escape(expr.function, CommaArg)}` +
        expr.args.map((x) => "," + toNormalString(x)).join("") +
        ")"
      );
    case "value":
      return valueToNormalString(expr);
    case "property":
      return `'${escape(expr.property, Single)}'`;
    case "var":
      return `$${escape(expr.variable, Dollar)}$`;
    case "lambda":
      return `\\${escape(expr.variable, Commas)},` + toNormalString(expr.expr);
    case "let":
      return (
        "=" +
        expr.variables
          .map(
            ([name, val]) =>
              "," + escape(name, Commas) + "," + toNormalString(val),
          )
          .join("") +
        "=" +
        toNormalString(expr.expr)
      );
    default:
      throw new Error(`Unknown EvalExpr type: ${(expr as any).type}`);
  }
}

function valueToNormalString(expr: EvalExpr): string {
  if (expr.type !== "value") throw new Error("Not a ValueExpr");
  const v = expr.value;
  if (v === null || v === undefined) return "n";
  if (typeof v === "string") return `\"${escape(v, Quote)}\"`;
  if (typeof v === "boolean") return v ? "t" : "f";
  if (typeof v === "number")
    return Number.isSafeInteger(v) ? v.toString() : `d${v}`;
  throw new Error(`Unsupported ValueExpr value: ${v}`);
}
