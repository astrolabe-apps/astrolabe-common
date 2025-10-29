import {
  alterEnv,
  EnvValue,
  EvalEnv,
  EvalEnvState,
  EvalExpr,
  FunctionValue,
  lookupVar,
  mapAllEnv,
  mapEnv,
  Path,
  segmentPath,
  valueExpr,
  ValueExpr,
} from "./ast";

export function evaluateWith(
  env: EvalEnv,
  value: ValueExpr,
  ind: number | null,
  expr: EvalExpr,
): EnvValue<ValueExpr> {
  return evaluateWithValue(env, value, valueExpr(ind), expr);
}
export function evaluateWithValue(
  env: EvalEnv,
  value: ValueExpr,
  bindValue: ValueExpr,
  expr: EvalExpr,
): EnvValue<ValueExpr> {
  const [e, toEval] = checkLambda();
  return alterEnv(e.withCurrent(value).evaluate(toEval), (e) =>
    e.withCurrent(env.current),
  );

  function checkLambda(): EnvValue<EvalExpr> {
    switch (expr.type) {
      case "lambda":
        return [env.withVariables([[expr.variable, bindValue]]), expr.expr];
      default:
        return [env, expr];
    }
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
      return funcCall.function!.eval(env, expr);
    case "property":
      return env.evaluate(
        env.state.data.getProperty(env.current, expr.property),
      );
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

  get current() {
    return this.state.current;
  }

  get errors() {
    return this.state.errors;
  }

  get data() {
    return this.state.data;
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
    return lookupVar(this.state, name);
  }

  withVariables(vars: [string, EvalExpr][]): EvalEnv {
    // Optimize: Create a single child scope with all variables
    // instead of nested scopes (one per variable)
    if (vars.length === 0) {
      return this;
    }

    if (vars.length === 1) {
      // Single variable - use existing withVariable
      return this.withVariable(vars[0][0], vars[0][1]);
    }

    // Evaluate all variables sequentially, threading environment
    let currentEnv = this as EvalEnv;
    const evaluatedVars: Record<string, ValueExpr> = {};

    for (const [name, expr] of vars) {
      const [nextEnv, value] = currentEnv.evaluate(expr);
      evaluatedVars[name] = value;
      currentEnv = nextEnv;  // Thread for sequential evaluation
    }

    // Create single child scope with all variables
    return this.newEnv({
      ...currentEnv.state,
      localVars: evaluatedVars,    // All variables in ONE scope
      parent: this.state             // Parent is original scope
    });
  }

  withVariable(name: string, expr: EvalExpr): EvalEnv {
    const [nextEnv, value] = this.evaluate(expr);
    // Create a new child scope with this single variable
    // The new scope has empty localVars except for this variable
    // and points to the current scope as parent
    return this.newEnv({
      ...nextEnv.state,
      localVars: { [name]: value },
      parent: nextEnv.state  // Current state becomes parent
    });
  }

  withCurrent(current: ValueExpr): EvalEnv {
    return this.newEnv({ ...this.state, current });
  }
}
