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

/**
 * Abstract base class for expression evaluation environments.
 * Concrete implementations (BasicEvalEnv, PartialEvalEnv) handle
 * scoping, caching, and evaluation strategy.
 */
export abstract class EvalEnv {
  abstract compare(v1: unknown, v2: unknown): number;

  /**
   * Create a new scope with the given variable bindings.
   * Bindings are stored unevaluated and evaluated lazily on first access.
   *
   * @param vars - Variable bindings (name -> unevaluated expression)
   * @returns New environment with the variables in scope
   */
  abstract newScope(vars: Record<string, EvalExpr>): EvalEnv;

  /**
   * Evaluate an expression and return the result.
   * Errors are attached to the ValueExpr via the errors field.
   *
   * @param expr - The expression to evaluate
   * @returns The evaluated expression (ValueExpr for full evaluation, EvalExpr for partial)
   */
  abstract evaluateExpr(expr: EvalExpr): EvalExpr;

  /**
   * Get the current data context value (_).
   * Returns EvalExpr if defined, undefined otherwise.
   *
   * @returns The current value as EvalExpr, or undefined if not available
   */
  abstract getCurrentValue(): EvalExpr | undefined;
  /**
   * Attach dependencies to a ValueExpr result.
   * Dependencies are used for reactive updates and error collection.
   *
   * @param result - The ValueExpr to attach dependencies to
   * @param deps - Array of dependency expressions (only ValueExpr deps are attached)
   * @returns ValueExpr with dependencies attached
   */
  withDeps(result: ValueExpr, deps: EvalExpr[]): ValueExpr {
    // Filter to only ValueExpr deps and skip if empty
    const valueDeps = deps.filter((d): d is ValueExpr => d.type === "value");
    if (valueDeps.length === 0) {
      return result;
    }

    // Merge with existing deps if present
    const existingDeps = result.deps || [];
    const allDeps = [...existingDeps, ...valueDeps];

    return {
      ...result,
      deps: allDeps,
    };
  }
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
  data?: Record<string, unknown>;
}

export interface LetExpr {
  type: "let";
  variables: [VarExpr, EvalExpr][];
  expr: EvalExpr;
  location?: SourceLocation;
  data?: Record<string, unknown>;
}
export interface ArrayExpr {
  type: "array";
  values: EvalExpr[];
  location?: SourceLocation;
  data?: Record<string, unknown>;
}

export interface CallExpr {
  type: "call";
  function: string;
  args: EvalExpr[];
  location?: SourceLocation;
  data?: Record<string, unknown>;
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
  error?: string;
  data?: Record<string, unknown>;
  location?: SourceLocation;
}

export interface PropertyExpr {
  type: "property";
  property: string;
  location?: SourceLocation;
  data?: Record<string, unknown>;
}

export interface LambdaExpr {
  type: "lambda";
  variable: string;
  expr: EvalExpr;
  location?: SourceLocation;
  data?: Record<string, unknown>;
}

export interface FunctionValue {
  eval: (env: EvalEnv, args: CallExpr) => EvalExpr;
  getType: (env: CheckEnv, args: CallExpr) => CheckValue<EvalType>;
}

export function concatPath(path1: Path, path2: Path): Path {
  if (path2.segment == null) return path1;
  return { ...path2, parent: concatPath(path1, path2.parent!) };
}

export function varExpr(variable: string, location?: SourceLocation): VarExpr {
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

export function constGetType(
  type: EvalType,
): (env: CheckEnv, call: CallExpr) => CheckValue<EvalType> {
  return (env) => checkValue(env, type);
}
const defaultGetType = constGetType(AnyType);

export function flatmapExpr(left: EvalExpr, right: EvalExpr) {
  return callExpr(".", [left, right]);
}

export function compareSignificantDigits(
  digits: number,
): (v1: unknown, v2: unknown) => number {
  const multiplier = Math.pow(10, digits);
  return (v1, v2) => {
    // Handle null comparisons explicitly to match C# behavior
    if (v1 == null && v2 == null) return 0;
    if (v1 == null || v2 == null) return 1;
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

/**
 * Get property from a ValueExpr object.
 * Handles path tracking and dependency preservation.
 */
export function getPropertyFromValue(
  object: ValueExpr,
  property: string,
): ValueExpr {
  const propPath = object.path ? segmentPath(property, object.path) : undefined;
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
        deps: combinedDeps.length > 0 ? combinedDeps : undefined,
      };
    }
  }
  return valueExpr(null, propPath);
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

/**
 * Recursively collects all errors from a ValueExpr and its dependencies.
 * Handles circular references via visited set.
 *
 * @param expr - The expression to collect errors from
 * @returns Array of all error messages found
 */
export function collectAllErrors(expr: EvalExpr): string[] {
  if (expr.type !== "value") return [];

  const errors: string[] = [];
  const visited = new Set<ValueExpr>();

  function walk(e: ValueExpr) {
    if (visited.has(e)) return;
    visited.add(e);

    if (e.error) {
      errors.push(e.error);
    }

    if (e.deps) {
      for (const dep of e.deps) {
        walk(dep);
      }
    }
  }

  walk(expr);
  return errors;
}

/**
 * Checks if a ValueExpr or any of its dependencies has errors.
 *
 * @param expr - The expression to check
 * @returns true if any errors exist
 */
export function hasErrors(expr: EvalExpr): boolean {
  if (expr.type !== "value") return false;

  const visited = new Set<ValueExpr>();

  function check(e: ValueExpr): boolean {
    if (visited.has(e)) return false;
    visited.add(e);

    if (e.error) return true;

    if (e.deps) {
      for (const dep of e.deps) {
        if (check(dep)) return true;
      }
    }

    return false;
  }

  return check(expr);
}

/**
 * Creates a ValueExpr with an error message attached.
 *
 * @param value - The value (typically null for error cases)
 * @param error - Error message
 * @param opts - Optional location information
 * @returns ValueExpr with error field populated
 */
export function valueExprWithError(
  value: unknown,
  error: string,
  opts?: {
    location?: SourceLocation;
  },
): ValueExpr {
  return {
    type: "value",
    value: value as any,
    error,
    location: opts?.location,
  };
}

/**
 * Creates a ValueExpr with an error, copying the location from the source expression.
 *
 * @param expr - The source expression (provides location)
 * @param error - The error message
 * @returns ValueExpr with null value, error message, and location from expr
 */
export function exprWithError(expr: EvalExpr, error: string): ValueExpr {
  return {
    type: "value",
    value: null,
    error,
    location: expr.location,
  };
}

/**
 * Represents an error with its source location and call stack.
 */
export interface ErrorWithLocation {
  message: string;
  location?: SourceLocation;
  stack: SourceLocation[];
}

/**
 * Collects all errors from a ValueExpr with their locations and stack traces.
 * The stack trace shows the chain of expressions from outer to inner.
 *
 * @param expr - The expression to collect errors from
 * @returns Array of errors with location info and stack traces
 */
export function collectErrorsWithLocations(expr: EvalExpr): ErrorWithLocation[] {
  if (expr.type !== "value") return [];

  const results: ErrorWithLocation[] = [];
  const visited = new Set<ValueExpr>();

  function walk(e: ValueExpr, stack: SourceLocation[]) {
    if (visited.has(e)) return;
    visited.add(e);

    const currentStack = e.location ? [...stack, e.location] : stack;

    if (e.error) {
      results.push({
        message: e.error,
        location: e.location,
        stack: currentStack,
      });
    }

    if (e.deps) {
      for (const dep of e.deps) {
        walk(dep, currentStack);
      }
    }
  }

  walk(expr, []);
  return results;
}

/**
 * Get a typed value from an expression's data dictionary.
 *
 * @param expr - The expression to get data from
 * @param key - The key to look up
 * @returns The value cast to type T, or undefined if not present
 */
export function getExprData<T>(expr: EvalExpr, key: string): T | undefined {
  return expr.data?.[key] as T | undefined;
}

/**
 * Check if an expression has data for a specific key.
 *
 * @param expr - The expression to check
 * @param key - The key to look for
 * @returns true if the key exists in the data dictionary
 */
export function hasExprData(expr: EvalExpr, key: string): boolean {
  return expr.data !== undefined && key in expr.data;
}

/**
 * Create a new expression with a key-value pair added to its data dictionary.
 *
 * @param expr - The expression to add data to
 * @param key - The key to set
 * @param value - The value to store
 * @returns A new expression with the data added
 */
export function withExprData<E extends EvalExpr>(
  expr: E,
  key: string,
  value: unknown,
): E {
  return { ...expr, data: { ...expr.data, [key]: value } };
}

/**
 * Create a new expression with a key removed from its data dictionary.
 *
 * @param expr - The expression to remove data from
 * @param key - The key to remove
 * @returns A new expression with the key removed (or undefined data if empty)
 */
export function withoutExprData<E extends EvalExpr>(expr: E, key: string): E {
  if (!expr.data || !(key in expr.data)) return expr;
  const { [key]: _, ...rest } = expr.data;
  return { ...expr, data: Object.keys(rest).length > 0 ? rest : undefined };
}
