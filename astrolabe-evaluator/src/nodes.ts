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

export type EnvValue<T> = [EvalEnv, T];

export abstract class EvalEnv {
  abstract basePath: Path;
  abstract errors: string[];
  abstract state: EvalEnvState;
  abstract getVariable(name: string): ValueExpr | undefined;
  abstract getData(path: Path): ValueExpr;
  abstract withVariables(vars: [string, EvalExpr][]): EvalEnv;
  abstract withVariable(name: string, expr: EvalExpr): EvalEnv;
  abstract withBasePath(path: Path): EvalEnv;
  abstract evaluate(expr: EvalExpr): EnvValue<ValueExpr>;
  abstract withError(error: string): EvalEnv;
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

export function evaluateElem(
  env: EvalEnv,
  value: ValueExpr,
  ind: number,
  expr: EvalExpr,
): EnvValue<ValueExpr> {
  switch (expr.type) {
    case "lambda":
      return alterEnv(
        env
          .withVariables([
            [expr.variable, valueExpr(ind)],
            [expr.variable + "_elem", value],
          ])
          .withBasePath(value.path ?? env.basePath)
          .evaluate(expr.expr),
        (x) => x.withBasePath(env.basePath),
      );
    default:
      if (!value.path) throw new Error("No path for element, must use lambda");
      return alterEnv(env.withBasePath(value.path).evaluate(expr), (x) =>
        x.withBasePath(env.basePath),
      );
  }
}

export function defaultEvaluate(
  env: EvalEnv,
  expr: EvalExpr,
): EnvValue<ValueExpr> {
  switch (expr.type) {
    case "var":
      const varExpr = env.getVariable(expr.variable);
      if (varExpr == null)
        return [
          env.withError("Variable $" + expr.variable + " not declared"),
          valueExpr(null),
        ];
      return env.evaluate(varExpr);
    case "let":
      return env.withVariables(expr.variables).evaluate(expr.expr);
    case "value":
      return [env, expr];
    case "call":
      const funcCall = env.getVariable(expr.function);
      if (funcCall == null)
        return [
          env.withError("Function $" + expr.function + " not declared"),
          valueExpr(null),
        ];
      return (funcCall.value as FunctionValue)(env, expr);
    case "property":
      const actualPath = segmentPath(expr.property, env.basePath);
      const dataValue = env.getData(actualPath);
      return env.evaluate(dataValue);
    case "array":
      return mapEnv(mapAllEnv(env, expr.values, doEvaluate), (v) => ({
        value: v,
        type: "value",
      }));
    default:
      throw "Can't evaluate this:" + expr.type;
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

function doEvaluate(env: EvalEnv, expr: EvalExpr) {
  return env.evaluate(expr);
}

export interface EvalEnvState {
  data: any;
  basePath: Path;
  vars: Record<string, ValueExpr>;
  errors: string[];
}
export class BasicEvalEnv extends EvalEnv {
  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    return defaultEvaluate(this, expr);
  }
  constructor(public state: EvalEnvState) {
    super();
  }

  get errors() {
    return this.state.errors;
  }

  get basePath() {
    return this.state.basePath;
  }

  protected newEnv(newState: EvalEnvState): EvalEnv {
    return new BasicEvalEnv(newState);
  }

  withError(error: string): EvalEnv {
    return this.newEnv({
      ...this.state,
      errors: [...this.state.errors, error],
    });
  }

  getVariable(name: string): ValueExpr | undefined {
    return this.state.vars[name];
  }
  getData(path: Path): ValueExpr {
    const getNode: (path: Path) => unknown = (path) => {
      if (path.segment == null) return this.state.data;
      const parentObject = getNode(path.parent);
      if (parentObject == null) return null;
      const value =
        typeof parentObject == "object"
          ? (parentObject as any)[path.segment]
          : null;
      return value == null ? null : value;
    };
    let dataValue = getNode(path);
    if (Array.isArray(dataValue)) {
      dataValue = dataValue.map((x, i) => valueExpr(x, segmentPath(i, path)));
    }
    return valueExpr(dataValue, path);
  }
  withVariables(vars: [string, EvalExpr][]): EvalEnv {
    return vars.reduce((e, v) => e.withVariable(v[0], v[1]), this as EvalEnv);
  }

  withVariable(name: string, expr: EvalExpr): EvalEnv {
    const [nextEnv, value] = this.evaluate(expr);
    const outVars = { ...nextEnv.state.vars };
    outVars[name] = value;
    return this.newEnv({ ...nextEnv.state, vars: outVars });
  }

  withBasePath(path: Path): EvalEnv {
    return this.newEnv({ ...this.state, basePath: path });
  }
}

export function addDefaults(evalEnv: EvalEnv) {
  return evalEnv.withVariables(Object.entries(defaultFunctions));
}

export function emptyEnvState(data: any): EvalEnvState {
  return {
    data,
    basePath: { segment: null },
    vars: {},
    errors: [],
  };
}

export function basicEnv(data: any): EvalEnv {
  return addDefaults(new BasicEvalEnv(emptyEnvState(data)));
}

export const whichFunction: ValueExpr = functionValue((e, call) => {
  const [c, ...args] = call.args;
  let [env, cond] = e.evaluate(c);
  let i = 0;
  while (i < args.length - 1) {
    const compare = args[i++];
    const value = args[i++];
    const [nextEnv, compValue] = env.evaluate(compare);
    env = nextEnv;
    if (compValue.value == cond.value) return nextEnv.evaluate(value);
  }
  return [env, valueExpr(null)];
});

export function binFunction(func: (a: any, b: any) => unknown): ValueExpr {
  return functionValue((env, call) => {
    const [nextEnv, [{ value: a }, { value: b }]] = mapAllEnv(
      env,
      call.args,
      doEvaluate,
    );
    if (a == null || b == null) return [nextEnv, valueExpr(null)];
    return [nextEnv, valueExpr(func(a, b))];
  });
}

export function evaluateAll(e: EvalEnv, expr: EvalExpr[]) {
  return mapAllEnv(e, expr, doEvaluate);
}

export function evalFunction(run: (args: unknown[]) => unknown): ValueExpr {
  return functionValue((e, call) =>
    mapEnv(evaluateAll(e, call.args), (a) =>
      valueExpr(run(a.map((x) => x.value))),
    ),
  );
}

function allElems(v: ValueExpr): ValueExpr[] {
  if (Array.isArray(v.value)) return v.value.flatMap(allElems);
  return [v];
}

const mapFunction = functionValue((env: EvalEnv, call: CallExpr) => {
  const [left, right] = call.args;
  const [leftEnv, { value }] = env.evaluate(left);
  if (Array.isArray(value)) {
    return mapEnv(
      mapAllEnv(leftEnv, value, (e, elem: ValueExpr, i) =>
        evaluateElem(e, elem, i, right),
      ),
      (vals) => valueExpr(vals.flatMap(allElems)),
    );
  }
  console.error(value, left);
  throw new Error("Can't map this:");
});

const filterFunction = functionValue((env: EvalEnv, call: CallExpr) => {
  const [left, right] = call.args;
  const [leftEnv, { value, path }] = env.evaluate(left);
  if (Array.isArray(value)) {
    const accArray: ValueExpr[] = [];
    const outEnv = value.reduce(
      (e, x: ValueExpr, ind) =>
        envEffect(evaluateElem(e, x, ind, right), ({ value }) => {
          if ((typeof value === "number" && ind === value) || value === true)
            accArray.push(x);
        }),
      leftEnv,
    );
    return [outEnv, valueExpr(accArray)];
  }
  console.error(value, path);
  throw new Error("Can't filter this:");
});

const condFunction = functionValue((env: EvalEnv, call: CallExpr) => {
  return mapEnv(
    mapAllEnv(env, call.args, doEvaluate),
    ([{ value: c }, e1, e2]) =>
      c === true ? e1 : c === false ? e2 : valueExpr(null),
  );
});

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [v];
}

function aggFunction<A>(init: A, op: (acc: A, x: unknown) => A): ValueExpr {
  function performOp(v: ValueExpr[]): unknown {
    return v.reduce(
      (a, { value: b }) => (a != null && b != null ? op(a as A, b) : null),
      init as A | null,
    );
  }
  return functionValue((e, call) => {
    const [ne, v] = mapAllEnv(e, call.args, doEvaluate);
    if (v.length == 1)
      return [ne, valueExpr(performOp(v[0].value as ValueExpr[]))];
    return [ne, valueExpr(performOp(v))];
  });
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
      if (Array.isArray(v)) return v.map((x) => toString(x.value)).join("");
      if (v == null) return "null";
      return JSON.stringify(v);
    default:
      return (v as any).toString();
  }
}

const stringFunction = functionValue((e, { args }) =>
  mapEnv(evaluateAll(e, args), (x) => valueExpr(toString(x))),
);

const flatFunction = functionValue((e, call) => {
  const allArgs = mapAllEnv(e, call.args, doEvaluate);
  return mapEnv(allArgs, (x) => valueExpr(x.flatMap(allElems)));
});

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

export const objectFunction = functionValue((e, call) => {
  return mapEnv(evaluateAll(e, call.args), (args) => {
    const outObj: Record<string, unknown> = {};
    let i = 0;
    while (i < args.length - 1) {
      outObj[toNative(args[i++]) as string] = toNative(args[i++]);
    }
    return valueExpr(outObj);
  });
});

const defaultFunctions = {
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
  notEmpty: evalFunction(([a]) => !(a === "" || a == null)),
  which: whichFunction,
  object: objectFunction,
  elem: evalFunction((args) => {
    const elem = (args[0] as ValueExpr[])?.[args[1] as number];
    return elem == null ? null : elem.value;
  }),
  ".": mapFunction,
  "[": filterFunction,
};
