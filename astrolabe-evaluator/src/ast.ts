import { evaluateElem } from "./evaluate";

export interface EmptyPath {
  segment: null;
}
export interface SegmentPath {
  segment: string | number;
  parent: Path;
}
export type Path = EmptyPath | SegmentPath;

export const EmptyPath: EmptyPath = { segment: null };

export function propertyExpr(property: string): PropertyExpr {
  return {
    type: "property",
    property,
  };
}

export function segmentPath(segment: string | number, parent?: Path) {
  return { segment, parent: parent ?? EmptyPath };
}

export type EnvValue<T> = [EvalEnv, T];

export interface EvalEnvState {
  data: any;
  basePath: Path;
  vars: Record<string, ValueExpr>;
  errors: string[];
  compare: (v1: unknown, v2: unknown) => number;
}

export abstract class EvalEnv {
  abstract basePath: Path;
  abstract errors: string[];
  abstract state: EvalEnvState;
  abstract getVariable(name: string): ValueExpr | undefined;
  abstract getData(path: Path): ValueExpr;
  abstract compare(v1: unknown, v2: unknown): number;
  abstract withVariables(vars: [string, EvalExpr][]): EvalEnv;
  abstract withVariable(name: string, expr: EvalExpr): EvalEnv;
  abstract withBasePath(path: Path): EvalEnv;
  abstract evaluate(expr: EvalExpr): EnvValue<ValueExpr>;
  abstract withError(error: string): EvalEnv;
}

export type EvalExpr =
  | LetExpr
  | ArrayExpr
  | CallExpr
  | VarExpr
  | LambdaExpr
  | ValueExpr
  | PropertyExpr;

export interface VarExpr {
  type: "var";
  variable: string;
}

export interface LetExpr {
  type: "let";
  variables: [string, EvalExpr][];
  expr: EvalExpr;
}
export interface ArrayExpr {
  type: "array";
  values: EvalExpr[];
}

export interface CallExpr {
  type: "call";
  function: string;
  args: EvalExpr[];
}

export interface ValueExpr {
  type: "value";
  value: any;
  path?: Path;
}

export interface PropertyExpr {
  type: "property";
  property: string;
}

export interface LambdaExpr {
  type: "lambda";
  variable: string;
  expr: EvalExpr;
}

export type FunctionValue = (
  env: EvalEnv,
  args: CallExpr,
) => EnvValue<ValueExpr>;

export function concatPath(path1: Path, path2: Path): Path {
  if (path2.segment == null) return path1;
  return { ...path2, parent: concatPath(path1, path2.parent!) };
}

export function varExpr(variable: string): VarExpr {
  return { type: "var", variable };
}

export type VarAssign = [string, EvalExpr];
export function letExpr(variables: VarAssign[], expr: EvalExpr): LetExpr {
  return { type: "let", variables, expr };
}

export function valueExpr(value: any, path?: Path): ValueExpr {
  return { type: "value", value, path };
}

export function lambdaExpr(variable: string, expr: EvalExpr): LambdaExpr {
  return { type: "lambda", variable, expr };
}

export function arrayExpr(values: EvalExpr[]): ArrayExpr {
  return { type: "array", values };
}

export function callExpr(name: string, args: EvalExpr[]): CallExpr {
  return { type: "call", function: name, args };
}

export function functionValue(
  evaluate: (e: EvalEnv, call: CallExpr) => EnvValue<ValueExpr>,
): ValueExpr {
  return valueExpr(evaluate);
}

export function mapExpr(left: EvalExpr, right: EvalExpr) {
  return callExpr(".", [left, right]);
}

export function mapEnv<T, T2>(
  envVal: EnvValue<T>,
  func: (v: T) => T2,
  envFunc?: (e: EvalEnv) => EvalEnv,
): EnvValue<T2> {
  const [e, v] = envVal;
  return [envFunc?.(e) ?? e, func(v)];
}

export function alterEnv<T>(
  envVal: EnvValue<T>,
  envFunc: (e: EvalEnv) => EvalEnv,
): EnvValue<T> {
  return [envFunc(envVal[0]), envVal[1]];
}

export function flatmapEnv<T, T2>(
  envVal: EnvValue<T>,
  func: (env: EvalEnv, v: T) => EnvValue<T2>,
): EnvValue<T2> {
  return func(envVal[0], envVal[1]);
}

export function withEnvValue<T, T2>(
  env: EnvValue<T>,
  func: (e: EvalEnv, t: T) => T2,
): T2 {
  return func(env[0], env[1]);
}

export function envEffect<T>(env: EnvValue<T>, func: (t: T) => any): EvalEnv {
  func(env[1]);
  return env[0];
}
export function mapAllEnv<T, T2>(
  env: EvalEnv,
  array: T[],
  func: (env: EvalEnv, value: T, ind: number) => EnvValue<T2>,
): EnvValue<T2[]> {
  const accArray: T2[] = [];
  const outEnv = array.reduce(
    (acc, x, ind) => envEffect(func(acc, x, ind), (nx) => accArray.push(nx)),
    env,
  );
  return [outEnv, accArray];
}

function compareSignificantDigits(
  digits: number,
): (v1: unknown, v2: unknown) => number {
  const multiplier = Math.pow(10, digits);
  return (v1, v2) => {
    switch (typeof v1) {
      case "number":
        return (
          Math.floor(multiplier * v1) - Math.floor(multiplier * (v2 as number))
        );
      case "string":
        return v1.localeCompare(v2 as string);
      case "boolean":
        return v1 === v2 ? 0 : 1;
      default:
        return 1;
    }
  };
}

export function emptyEnvState(data: any): EvalEnvState {
  return {
    data,
    basePath: { segment: null },
    vars: {},
    errors: [],
    compare: compareSignificantDigits(5),
  };
}


function toExpressions(expr: EvalExpr) {
  if (expr.type === "array") return flattenExpr(expr.values);
  return [expr];
}
function flattenExpr(expressions: EvalExpr[]): EvalExpr[] {
  return expressions.flatMap(toExpressions);
}

export function toNative(value: ValueExpr): unknown {
  if (Array.isArray(value.value)) {
    return value.value.map(toNative);
  }
  return value.value;
}

