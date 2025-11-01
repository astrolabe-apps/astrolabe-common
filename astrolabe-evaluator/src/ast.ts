export interface SourceLocation {
  start: number;
  end: number;
  sourceFile?: string;
}

export interface PrimitiveType {
  type: "number" | "string" | "boolean" | "null" | "any" | "never";
  constant?: unknown;
}

export interface ArrayType {
  type: "array";
  positional: EvalType[];
  restType?: EvalType;
}

export interface ObjectType {
  type: "object";
  id?: string;
  fields: Record<string, EvalType>;
}

export type GetReturnType = (
  e: CheckEnv,
  call: CallExpr,
) => CheckValue<EvalType>;

export interface FunctionType {
  type: "function";
  args: ArrayType;
  returnType: GetReturnType;
}

export type EvalType = PrimitiveType | ArrayType | ObjectType | FunctionType;

export function primitiveType(
  type: "number" | "string" | "boolean" | "null" | "any" | "never",
  constant?: unknown,
): PrimitiveType {
  return { type, constant };
}

export function getPrimitiveConstant(type: EvalType): unknown {
  if ("constant" in type) {
    return type.constant;
  }
  return undefined;
}

export const NumberType = primitiveType("number");

export const BooleanType = primitiveType("boolean");
export const StringType = primitiveType("string");
export const AnyType = primitiveType("any");
export const NeverType = primitiveType("never");
export const NullType = primitiveType("null");

export function arrayType(
  positional: EvalType[],
  restType?: EvalType,
): ArrayType {
  return { type: "array", positional, restType };
}

export function isArrayType(type: EvalType): type is ArrayType {
  return type.type === "array";
}

export function objectType(fields: Record<string, EvalType>): ObjectType {
  return { type: "object", fields };
}

export function namedObjectType(
  name: string,
  fields: () => Record<string, EvalType>,
): ObjectType {
  return new NamedObjectType(name, fields);
}

class NamedObjectType implements ObjectType {
  constructor(
    public name: string,
    public _fields: () => Record<string, EvalType>,
  ) {}

  get type(): "object" {
    return "object";
  }

  get fields() {
    return this._fields();
  }
}

export function isObjectType(type: EvalType): type is ObjectType {
  return type.type === "object";
}

export function functionType(
  args: ArrayType,
  returnType: (env: CheckEnv, args: CallExpr) => CheckValue<EvalType>,
): FunctionType {
  return { type: "function", args, returnType };
}

export function isFunctionType(type: EvalType): type is FunctionType {
  return type.type === "function";
}

export interface CheckEnv {
  vars: Record<string, EvalType>;
  dataType: EvalType;
}

export interface CheckValue<A> {
  env: CheckEnv;
  value: A;
}

export function addCheckVar(
  env: CheckEnv,
  name: string,
  evalType: EvalType,
): CheckEnv {
  return { ...env, vars: { ...env.vars, [name]: evalType } };
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

export function propertyExpr(
  property: string,
  location?: SourceLocation,
): PropertyExpr {
  return {
    type: "property",
    property,
    location,
  };
}

export function segmentPath(segment: string | number, parent?: Path) {
  return { segment, parent: parent ?? EmptyPath };
}

export type EnvValue<T> = [EvalEnv, T];

export interface EvalEnvState {
  data: EvalData;
  current: ValueExpr;
  localVars: Record<string, ValueExpr>;
  parent?: EvalEnvState;
  errors: string[];
  compare: (v1: unknown, v2: unknown) => number;
}

/**
 * Look up a variable in the scope chain.
 * Walks from current scope up through parents until found.
 * O(depth) complexity where depth is typically 2-5 scopes.
 */
export function lookupVar(
  state: EvalEnvState,
  name: string,
): ValueExpr | undefined {
  if (name in state.localVars) {
    return state.localVars[name];
  }
  return state.parent ? lookupVar(state.parent, name) : undefined;
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
  location?: SourceLocation;
}

export interface LetExpr {
  type: "let";
  variables: [VarExpr, EvalExpr][];
  expr: EvalExpr;
  location?: SourceLocation;
}
export interface ArrayExpr {
  type: "array";
  values: EvalExpr[];
  location?: SourceLocation;
}

export interface CallExpr {
  type: "call";
  function: string;
  args: EvalExpr[];
  location?: SourceLocation;
}

export interface ValueExpr {
  type: "value";
  value?:
    | string
    | number
    | boolean
    | Record<string, ValueExpr>
    | ValueExpr[]
    | null
    | undefined;
  function?: FunctionValue;
  path?: Path;
  deps?: ValueExpr[];
  location?: SourceLocation;
}

export interface PropertyExpr {
  type: "property";
  property: string;
  location?: SourceLocation;
}

export interface LambdaExpr {
  type: "lambda";
  variable: string;
  expr: EvalExpr;
  location?: SourceLocation;
}

export interface FunctionValue {
  eval: (env: EvalEnv, args: CallExpr) => EnvValue<ValueExpr>;
  getType: (env: CheckEnv, args: CallExpr) => CheckValue<EvalType>;
}

export function concatPath(path1: Path, path2: Path): Path {
  if (path2.segment == null) return path1;
  return { ...path2, parent: concatPath(path1, path2.parent!) };
}

export function varExpr(
  variable: string,
  location?: SourceLocation,
): VarExpr {
  return { type: "var", variable, location };
}

export type VarAssign = [VarExpr, EvalExpr];
export function letExpr(
  variables: VarAssign[],
  expr: EvalExpr,
  location?: SourceLocation,
): LetExpr {
  return { type: "let", variables, expr, location };
}

export function valueExpr(
  value: any,
  path?: Path,
  location?: SourceLocation,
): ValueExpr {
  return { type: "value", value, path, location };
}

export function isStringExpr(expr: EvalExpr): expr is ValueExpr {
  return expr.type === "value" && typeof expr.value === "string";
}
export function valueExprWithDeps(value: any, deps: ValueExpr[]): ValueExpr {
  return {
    type: "value",
    value,
    deps: deps.length > 0 ? deps : undefined,
  };
}

/**
 * Recursively extract all paths from a ValueExpr and its dependencies.
 * This replaces the old eager flattening with lazy extraction.
 *
 * @param expr The ValueExpr to extract paths from
 * @returns Array of all paths referenced by this expr and its dependencies
 */
export function extractAllPaths(expr: ValueExpr): Path[] {
  const paths: Path[] = [];
  const seen = new Set<ValueExpr>(); // Avoid infinite loops

  function extract(ve: ValueExpr) {
    if (seen.has(ve)) return;
    seen.add(ve);

    if (ve.path) paths.push(ve.path);
    if (ve.deps) {
      // Recursively extract paths from all dependency ValueExprs
      for (const dep of ve.deps) {
        extract(dep);
      }
    }
  }

  extract(expr);
  return paths;
}

export const NullExpr = valueExpr(null);

export function lambdaExpr(
  variable: string,
  expr: EvalExpr,
  location?: SourceLocation,
): LambdaExpr {
  return { type: "lambda", variable, expr, location };
}

export function arrayExpr(
  values: EvalExpr[],
  location?: SourceLocation,
): ArrayExpr {
  return { type: "array", values, location };
}

export function callExpr(
  name: string,
  args: EvalExpr[],
  location?: SourceLocation,
): CallExpr {
  return { type: "call", function: name, args, location };
}

export function functionValue(
  evaluate: (e: EvalEnv, call: CallExpr) => EnvValue<ValueExpr>,
  getType: (e: CheckEnv, call: CallExpr) => CheckValue<EvalType>,
): ValueExpr {
  return {
    type: "value",
    function: { eval: evaluate, getType },
  };
}

export function constGetType(
  type: EvalType,
): (env: CheckEnv, call: CallExpr) => CheckValue<EvalType> {
  return (env) => checkValue(env, type);
}
const defaultGetType = constGetType(AnyType);

export function flatmapExpr(left: EvalExpr, right: EvalExpr) {
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
  if (typeof value === "object" && value != null) {
    const objValue = value as Record<string, unknown>;
    const converted: Record<string, ValueExpr> = {};
    for (const key in objValue) {
      converted[key] = toValue(
        path != null ? segmentPath(key, path) : undefined,
        objValue[key],
      );
    }
    return valueExpr(converted, path);
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
      if (typeof value === "object" && value != null && !Array.isArray(value)) {
        const objValue = value as Record<string, ValueExpr>;
        const propValue = objValue[property];
        if (propValue) {
          // Preserve dependencies from parent object when accessing properties
          const combinedDeps: ValueExpr[] = [
            ...(object.deps || []),
            ...(propValue.deps || []),
          ];
          return {
            ...propValue,
            path: propPath,
            deps: combinedDeps.length > 0 ? combinedDeps : undefined
          };
        }
      }
      return valueExpr(null, propPath);
    },
  };
  return {
    data,
    current: data.root,
    localVars: {},
    parent: undefined,
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
  if (
    typeof value.value === "object" &&
    value.value != null &&
    !Array.isArray(value.value)
  ) {
    const objValue = value.value as Record<string, ValueExpr>;
    const result: Record<string, unknown> = {};
    for (const key in objValue) {
      result[key] = toNative(objValue[key]);
    }
    return result;
  }
  return value.value;
}
