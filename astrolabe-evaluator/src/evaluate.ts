import {
  alterEnv,
  emptyEnvState,
  EnvValue,
  EvalEnv,
  EvalEnvState,
  EvalExpr,
  FunctionValue,
  mapAllEnv,
  mapEnv,
  Path,
  segmentPath,
  valueExpr,
  ValueExpr,
} from "./ast";

export function evaluateElem(
  env: EvalEnv,
  value: ValueExpr,
  ind: number | null,
  expr: EvalExpr,
): EnvValue<ValueExpr> {
  switch (expr.type) {
    case "lambda":
      return alterEnv(
        env
          .withVariables([[expr.variable, valueExpr(ind)]])
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

export function doEvaluate(env: EvalEnv, expr: EvalExpr) {
  return env.evaluate(expr);
}

export function evaluateAll(e: EvalEnv, expr: EvalExpr[]) {
  return mapAllEnv(e, expr, doEvaluate);
}

export class BasicEvalEnv extends EvalEnv {
  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    return defaultEvaluate(this, expr);
  }
  constructor(public state: EvalEnvState) {
    super();
  }

  compare(v1: unknown, v2: unknown): number {
    return this.state.compare(v1, v2);
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
