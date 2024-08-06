export interface EmptyPath {
  segment: null;
}
export interface SegmentPath {
  segment: string | number;
  parent: Path;
}
export type Path = EmptyPath | SegmentPath;

export const EmptyPath: EmptyPath = { segment: null };

export function pathExpr(
  path: Path | string | number,
  resolved?: boolean,
): PathExpr {
  return {
    type: "path",
    path:
      typeof path === "object" ? path : { segment: path, parent: EmptyPath },
    resolved: !!resolved,
  };
}

export function segmentPath(segment: string | number, parent?: Path) {
  return { segment, parent: parent ?? EmptyPath };
}
export type EvalExpr =
  | LetExpr
  | ArrayExpr
  | CallExpr
  | VarExpr
  | LambdaExpr
  | ValueExpr
  | FunctionExpr
  | OptionalExpr
  | PathExpr;

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

export interface OptionalExpr {
  type: "optional";
  value: EvalExpr;
  condition: EvalExpr;
}

export interface CallExpr {
  type: "call";
  function: string;
  args: EvalExpr[];
}

export interface ValueExpr {
  type: "value";
  value: any;
}

export interface PathExpr {
  type: "path";
  path: Path;
  resolved: boolean;
}

export interface LambdaExpr {
  type: "lambda";
  variable: string;
  expr: EvalExpr;
}

export interface FunctionExpr {
  type: "func";
  resolve: (env: EvalEnv, call: CallExpr) => EnvValue<EvalExpr>;
  evaluate: (env: EvalEnv, args: unknown[]) => EnvValue<unknown>;
}

export type EnvValue<T> = [EvalEnv, T];

export abstract class EvalEnv {
  abstract basePath: Path;
  abstract getVariable(name: string): EvalExpr;
  abstract getData(path: Path): any;
  abstract withVariables(vars: [string, EvalExpr][]): EvalEnv;
  abstract withVariable(name: string, expr: EvalExpr): EvalEnv;
  abstract withBasePath(path: Path): EvalEnv;
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

export function valueExpr(value: any): ValueExpr {
  return { type: "value", value };
}

export function lambdaExpr(variable: string, expr: EvalExpr): LambdaExpr {
  return { type: "lambda", variable, expr };
}

export function arrayExpr(values: EvalExpr[]): ArrayExpr {
  return { type: "array", values };
}

export function optionalExpr(
  value: EvalExpr,
  condition: EvalExpr,
): OptionalExpr {
  return { type: "optional", value, condition };
}

export function callExpr(name: string, args: EvalExpr[]): CallExpr {
  return { type: "call", function: name, args };
}

export function mapExpr(left: EvalExpr, right: EvalExpr) {
  return callExpr(".", [left, right]);
}

export function resolveAndEval(
  env: EvalEnv,
  expr: EvalExpr,
): EnvValue<unknown> {
  return flatmapEnv(resolve(env, expr), evaluate);
}
export function resolve(env: EvalEnv, expr: EvalExpr): EnvValue<EvalExpr> {
  if (expr == null) debugger;
  switch (expr.type) {
    case "array":
      return mapEnv(mapAllEnv(env, expr.values, resolve), (x) => arrayExpr(x));
    case "var":
      const varExpr = env.getVariable(expr.variable);
      if (varExpr == null)
        throw new Error("Missing variable: " + expr.variable);
      return resolve(env, varExpr);
    case "optional":
      return mapEnv(
        mapAllEnv(env, [expr.value, expr.condition], resolve),
        ([x1, x2]) => optionalExpr(x1, x2),
      );
    case "value":
      return [env, expr];
    case "let":
      const envWithVars = expr.variables.reduce(
        (e, [name, x]) =>
          withEnvValue(resolve(e, x), (e2, x2) => e2.withVariable(name, x2)),
        env,
      );
      return resolve(envWithVars, expr.expr);
    case "call":
      const funcCall = env.getVariable(expr.function);
      if (funcCall == null)
        throw new Error("Unknown function " + expr.function);
      return (funcCall as FunctionExpr).resolve(env, expr);
    case "path":
      if (expr.resolved) return [env, expr];
      const fullPath = concatPath(env.basePath, expr.path);
      const pathData = env.getData(fullPath);
      if (Array.isArray(pathData)) {
        return [
          env,
          arrayExpr(
            pathData.map((x, i) =>
              pathExpr({ segment: i, parent: fullPath }, true),
            ),
          ),
        ];
      }
      return [env, pathExpr(fullPath, true)];
    case "lambda":
      return resolve(
        env.withVariables([[expr.variable, valueExpr(env.basePath.segment)]]),
        expr.expr,
      );
    default:
      debugger;
      throw new Error("Don't know how to resolve:" + expr.type);
  }
}

export function evaluateOptional(
  env: EvalEnv,
  expr: EvalExpr,
  index: number,
): EnvValue<unknown> {
  switch (expr.type) {
    case "optional":
      const cond = evaluate(env, expr.condition);
      const condValue = cond[1];
      return (typeof condValue == "number" && condValue == index) ||
        condValue === true
        ? flatmapEnv(cond, (e) => evaluate(e, expr.value))
        : mapEnv(cond, (_) => undefined);
    default:
      return evaluate(env, expr);
  }
}

export function evaluate(env: EvalEnv, expr: EvalExpr): EnvValue<unknown> {
  if (!env) debugger;
  switch (expr.type) {
    case "value":
      return [env, expr.value];
    case "call":
      const args = mapAllEnv(env, expr.args, evaluate);
      const funcCall = env.getVariable(expr.function);
      if (funcCall == null)
        throw new Error("Unknown function " + expr.function);
      return (funcCall as FunctionExpr).evaluate(args[0], args[1]);
    case "path":
      return [env, env.getData(expr.path)];
    case "array":
      return mapEnv(mapAllEnv(env, expr.values, evaluateOptional), (a) =>
        a.filter((x) => x !== undefined),
      );
    default:
      throw "Can't evaluate this";
  }
}

export function mapEnv<T, T2>(
  envVal: EnvValue<T>,
  func: (v: T) => T2,
  envFunc?: (e: EvalEnv) => EvalEnv,
): EnvValue<T2> {
  const [e, v] = envVal;
  return [envFunc?.(e) ?? e, func(v)];
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

class BasicEvalEnv extends EvalEnv {
  constructor(
    private data: any,
    public basePath: Path,
    private vars: Record<string, EvalExpr>,
  ) {
    super();
  }

  getVariable(name: string): EvalExpr {
    return this.vars[name]!;
  }
  getData(path: Path): any {
    if (path.segment == null) return this.data;
    const parentObject = this.getData(path.parent);
    if (parentObject == null) return null;
    return parentObject[path.segment];
  }
  withVariables(vars: [string, EvalExpr][]): EvalEnv {
    return new BasicEvalEnv(
      this.data,
      this.basePath,
      Object.fromEntries(Object.entries(this.vars).concat(vars)),
    );
  }

  withVariable(name: string, expr: EvalExpr): EvalEnv {
    const outVars = { ...this.vars };
    outVars[name] = expr;
    return new BasicEvalEnv(this.data, this.basePath, outVars);
  }

  withBasePath(path: Path): EvalEnv {
    return new BasicEvalEnv(this.data, path, this.vars);
  }
}

export function basicEnv(data: any): EvalEnv {
  return new BasicEvalEnv(
    data,
    { segment: null },
    {
      "?": condFunction,
      "!": evalFunction((a) => !a[0]),
      and: binFunction((a, b) => a && b),
      or: binFunction((a, b) => a || b),
      "+": binFunction((a, b) => a + b),
      "-": binFunction((a, b) => a - b),
      "*": binFunction((a, b) => a * b),
      "/": binFunction((a, b) => a / b),
      ">": binFunction((a, b) => a > b),
      "<": binFunction((a, b) => a < b),
      "<=": binFunction((a, b) => a <= b),
      ">=": binFunction((a, b) => a >= b),
      "=": binFunction((a, b) => a == b),
      "!=": binFunction((a, b) => a != b),
      array: flatFunction,
      string: stringFunction,
      sum: aggFunction(0, (acc, b) => acc + (b as number)),
      count: aggFunction(0, (acc, b) => acc + 1),
      min: aggFunction(Number.MAX_VALUE, (a, b) => Math.min(a, b as number)),
      max: aggFunction(Number.MIN_VALUE, (a, b) => Math.max(a, b as number)),
      notEmpty: evalFunction((a) => !!a[0]),
      which: whichFunction,
      ".": mapFunction,
      "[": filterFunction,
    },
  );
}

interface WhichState {
  current: EvalExpr;
  compare?: EvalExpr;
  toExpr?: EvalExpr;
}
export const whichFunction: FunctionExpr = {
  type: "func",
  resolve: (e, x) => {
    return resolve(
      e,
      x.args.reduce(
        (acc, a) =>
          !acc.compare
            ? { ...acc, compare: a }
            : !acc.toExpr
              ? { ...acc, toExpr: a }
              : {
                  compare: acc.compare,
                  current: callExpr("?", [
                    callExpr("=", [acc.compare, acc.toExpr]),
                    a,
                    acc.current,
                  ]),
                },
        {
          current: valueExpr(null),
        } as WhichState,
      ).current,
    );
  },
  evaluate: () => {
    throw new Error("No eval");
  },
};

function resolveCall(env: EvalEnv, callExpr: CallExpr): EnvValue<CallExpr> {
  return mapEnv(mapAllEnv(env, callExpr.args, resolve), (args) => ({
    ...callExpr,
    args,
  }));
}

export function binFunction(func: (a: any, b: any) => unknown): FunctionExpr {
  return {
    type: "func",
    resolve: resolveCall,
    evaluate: (env, args) => {
      const [a, b] = args;
      if (a == null || b == null) return [env, null];
      return [env, func(a, b)];
    },
  };
}

export function evalFunction(run: (args: unknown[]) => unknown): FunctionExpr {
  return {
    type: "func",
    resolve: resolveCall,
    evaluate: (e, args) => [e, run(args)],
  };
}

function resolveElem(
  elem: EnvValue<EvalExpr>,
  right: EvalExpr,
): EnvValue<EvalExpr> {
  const [nextEnv, firstArg] = elem;
  if (firstArg.type === "optional") {
    const resolvedVal = resolveElem([nextEnv, firstArg.value], right);
    return mapEnv(resolvedVal, (x) => ({ ...firstArg, value: x }));
  }
  if (firstArg.type === "path") {
    const pathData = nextEnv.getData(firstArg.path);
    if (pathData == null) return [nextEnv, valueExpr(null)];
    if (typeof pathData === "object") {
      return mapEnv(
        resolve(nextEnv.withBasePath(firstArg.path), right),
        (x) => x,
        (e) => e.withBasePath(nextEnv.basePath),
      );
    }
    throw new Error("Data can't be mapped");
  }
  if (firstArg.type === "array") {
    const elems = mapAllEnv(nextEnv, firstArg.values, (e, x) =>
      resolveElem([e, x], right),
    );
    return mapEnv(elems, (x) => arrayExpr(x));
  }
  debugger;
  throw new Error("Can't map:" + JSON.stringify(firstArg));
}

const mapFunction: FunctionExpr = {
  type: "func",
  resolve: (env: EvalEnv, call: CallExpr) => {
    const [left, right] = call.args;
    return resolveElem(resolve(env, left), right);
  },
  evaluate: (env: EvalEnv, args: any[]) => {
    throw new Error("Function not implemented.");
  },
};

const filterFunction: FunctionExpr = {
  type: "func",
  resolve: (env: EvalEnv, call: CallExpr) => {
    const [left, right] = call.args;
    const [nextEnv, leftValue] = resolve(env, left);
    if (leftValue.type === "array") {
      const filteredArray = mapAllEnv(nextEnv, leftValue.values, (e, v) =>
        mapEnv(resolveElem([e, v], right), (x) => optionalExpr(v, x)),
      );
      return mapEnv(filteredArray, (x) => arrayExpr(x));
    }
    throw new Error(
      "Function not implemented." + JSON.stringify(leftValue.type),
    );
  },
  evaluate: (env: EvalEnv, args: unknown[]) => {
    throw new Error("Should have been resolved");
  },
};

const condFunction: FunctionExpr = {
  type: "func",
  resolve: (env: EvalEnv, call: CallExpr) => {
    return mapEnv(mapAllEnv(env, call.args, resolve), (x) => ({
      ...call,
      args: x,
    }));
  },
  evaluate: (env: EvalEnv, args: any[]) => {
    return [env, args[0] ? args[1] : args[2]];
  },
};

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [v];
}

function aggFunction<A>(init: A, op: (acc: A, x: unknown) => A): FunctionExpr {
  function recurse(v: unknown[]): unknown {
    if (v.some(Array.isArray)) {
      return v.map((x) => recurse(asArray(x)));
    }
    return v.reduce(
      (a, b) => (a != null && b != null ? op(a as A, b) : null),
      init,
    );
  }
  return {
    type: "func",
    resolve: resolveCall,
    evaluate: (e, v) => {
      if (v.length == 1) return [e, recurse(v[0] as unknown[])];
      return [e, recurse(v)];
    },
  };
}

function toString(v: unknown): string {
  switch (typeof v) {
    case "string":
      return v;
    case "boolean":
      return v ? "true" : "false";
    case "undefined":
      return "null";
    case "object":
      if (Array.isArray(v)) return v.map(toString).join("");
      if (v == null) return "null";
      return JSON.stringify(v);
    default:
      return (v as any).toString();
  }
}

const stringFunction: FunctionExpr = {
  type: "func",
  resolve: resolveCall,
  evaluate: (env, vals) => [env, toString(vals)],
};

const flatFunction: FunctionExpr = {
  type: "func",
  resolve: (e, call) => {
    return mapEnv(resolveCall(e, call), (x) => arrayExpr(flattenExpr(x.args)));
  },
  evaluate: (e, vals) => {
    throw new Error("Should not get here");
  },
};

function toExpressions(expr: EvalExpr) {
  if (expr.type === "array") return flattenExpr(expr.values);
  return [expr];
}
function flattenExpr(expressions: EvalExpr[]): EvalExpr[] {
  return expressions.flatMap(toExpressions);
}
