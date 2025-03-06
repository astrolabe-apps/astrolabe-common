export interface PrimitiveType {
  type: "number" | "string" | "boolean" | "null" | "any" | "never";
  constant?: unknown;
}

export interface ArrayType {
  type: "array";
  positional: EnvType[];
  restType?: EnvType;
}

export interface ObjectType {
  type: "object";
  id?: string;
  fields: Record<string, EnvType>;
}

export interface FunctionType {
  type: "function";
  args: ArrayType;
  returnType: (env: CheckEnv, args: CallExpr) => CheckValue<EnvType>;
}

export type EnvType = PrimitiveType | ArrayType | ObjectType | FunctionType;

export function primitiveType(
  type: "number" | "string" | "boolean" | "null" | "any" | "never",
  constant?: unknown,
): PrimitiveType {
  return { type, constant };
}

export const AnyType = primitiveType("any");
export const NeverType = primitiveType("never");
export const NullType = primitiveType("null");

export function arrayType(
  positional: EnvType[],
  restType?: EnvType,
): ArrayType {
  return { type: "array", positional, restType };
}

export function isArrayType(type: EnvType): type is ArrayType {
  return type.type === "array";
}

export function objectType(fields: Record<string, EnvType>): ObjectType {
  return { type: "object", fields };
}

export function namedObjectType(
  name: string,
  fields: () => Record<string, EnvType>,
): ObjectType {
  return new NamedObjectType(name, fields);
}

class NamedObjectType implements ObjectType {
  constructor(
    public name: string,
    public _fields: () => Record<string, EnvType>,
  ) {}

  get type(): "object" {
    return "object";
  }

  get fields() {
    return this._fields();
  }
}

export function isObjectType(type: EnvType): type is ObjectType {
  return type.type === "object";
}

export function functionType(
  args: ArrayType,
  returnType: (env: CheckEnv, args: CallExpr) => CheckValue<EnvType>,
): FunctionType {
  return { type: "function", args, returnType };
}

export function isFunctionType(type: EnvType): type is FunctionType {
  return type.type === "function";
}

export interface CheckEnv {
  vars: Record<string, EnvType>;
  dataType: EnvType;
}

export interface CheckValue<A> {
  env: CheckEnv;
  value: A;
}

export function checkValue<A>(env: CheckEnv, value: A) {
  return { env, value };
}

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
  data: EvalData;
  current: ValueExpr;
  vars: Record<string, ValueExpr>;
  errors: string[];
  compare: (v1: unknown, v2: unknown) => number;
}

export interface EvalData {
  root: ValueExpr;
  getProperty(object: ValueExpr, property: string): ValueExpr;
}

export abstract class EvalEnv {
  abstract data: EvalData;
  abstract current: ValueExpr;
  abstract errors: string[];
  abstract state: EvalEnvState;
  abstract getVariable(name: string): ValueExpr | undefined;
  abstract compare(v1: unknown, v2: unknown): number;
  abstract withVariables(vars: [string, EvalExpr][]): EvalEnv;
  abstract withVariable(name: string, expr: EvalExpr): EvalEnv;
  abstract withCurrent(path: ValueExpr): EvalEnv;
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
  value?:
    | string
    | number
    | boolean
    | Record<string, unknown>
    | ValueExpr[]
    | null
    | undefined;
  function?: FunctionValue;
  path?: Path;
  deps?: Path[];
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

export interface FunctionValue {
  eval: (env: EvalEnv, args: CallExpr) => EnvValue<ValueExpr>;
  getType: (env: CheckEnv, args: CallExpr) => CheckValue<EnvType>;
}

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

export function valueExprWithDeps(value: any, deps: ValueExpr[]): ValueExpr {
  return {
    type: "value",
    value,
    deps: deps.flatMap(({ path, deps }) => [
      ...(deps ?? []),
      ...(path ? [path] : []),
    ]),
  };
}

export const NullExpr = valueExpr(null);

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
  getType?: (e: CheckEnv, call: CallExpr) => CheckValue<EnvType>,
): ValueExpr {
  return {
    type: "value",
    function: { eval: evaluate, getType: getType ?? defaultGetType },
  };
}

function defaultGetType(env: CheckEnv, call: CallExpr): CheckValue<EnvType> {
  return { env, value: AnyType };
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
          Math.round(multiplier * v1) - Math.round(multiplier * (v2 as number))
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

export function toValue(path: Path | undefined, value: unknown): ValueExpr {
  if (Array.isArray(value)) {
    return valueExpr(
      value.map((x, i) =>
        toValue(path != null ? segmentPath(i, path) : undefined, x),
      ),
      path,
    );
  }
  return valueExpr(value, path);
}

export function emptyEnvState(root: unknown): EvalEnvState {
  const data: EvalData = {
    root: toValue(EmptyPath, root),
    getProperty(object: ValueExpr, property: string): ValueExpr {
      const propPath = object.path
        ? segmentPath(property, object.path)
        : undefined;
      const value = object.value;
      if (typeof value === "object" && value != null) {
        return toValue(
          propPath,
          (value as Record<string, unknown>)[property] ?? null,
        );
      }
      return valueExpr(null, propPath);
    },
  };
  return {
    data,
    current: data.root,
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
