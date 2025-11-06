import {
  EvalEnv,
  EvalEnvState,
  EvalExpr,
  ValueExpr,
  VarExpr,
  PropertyExpr,
  CallExpr,
  ArrayExpr,
  LetExpr,
  LambdaExpr,
  EnvValue,
  valueExpr,
  lookupVar,
} from "./ast";
import { defaultEvaluate } from "./evaluate";

/**
 * Specialized environment for partial evaluation that distinguishes between
 * compile-time values (variables) and runtime fields (properties).
 */
export class PartialEvalEnvironment extends EvalEnv {
  constructor(public state: EvalEnvState) {
    super();
  }

  /**
   * Override evaluateExpr - main implementation for partial evaluation.
   * Handles all expression types, returning partially-evaluated results.
   */
  evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr> {
    switch (expr.type) {
      case "value":
        return [this, expr];

      case "var": {
        // Try to substitute with compile-time value if known
        const varValue = this.getVariable(expr.variable);
        return varValue
          ? this.evaluateExpr(varValue)  // Recursively evaluate
          : [this, expr];                 // Keep as runtime variable
      }

      case "property": {
        // Only evaluate if we have data context
        if (this.hasDataContext()) {
          return [this, this.state.data.getProperty(this.state.current, expr.property)];
        }
        return [this, expr];  // Keep as runtime property
      }

      case "call": {
        // If function exists, call defaultEvaluate; else return CallExpr unchanged
        const funcValue = this.getVariable(expr.function);
        if (funcValue && funcValue.function) {
          const [env, result] = defaultEvaluate(this, expr);
          return [env, result];  // result is already EvalExpr
        }
        return [this, expr];  // Unknown function - keep as partial CallExpr
      }

      case "let": {
        // Evaluate all bindings and add to environment
        let newEnv: PartialEvalEnvironment = this;
        const bindings: Record<string, EvalExpr> = {};

        for (const [varExpr, binding] of expr.variables) {
          const [nextEnv, evaluated] = newEnv.evaluateExpr(binding);
          bindings[varExpr.variable] = evaluated;
          newEnv = nextEnv.withVariable(varExpr.variable, evaluated) as PartialEvalEnvironment;
        }

        // Evaluate body with extended environment
        const [finalEnv, body] = newEnv.evaluateExpr(expr.expr);

        // Collect free variables in the result
        const freeVars = collectFreeVars(body);
        const neededBindings = Object.entries(bindings)
          .filter(([name, val]) => freeVars.has(name) && val.type !== 'value')
          .map(([name, val]): [VarExpr, EvalExpr] => [{ type: 'var', variable: name }, val]);

        // Return body alone if no partial bindings needed, else wrap in LetExpr
        return neededBindings.length === 0
          ? [finalEnv, body]
          : [finalEnv, { type: 'let', variables: neededBindings, expr: body }];
      }

      case "array": {
        // Evaluate all elements
        const [envAfterArray, elements] = mapAllEnv(this, expr.values, (env, val) => env.evaluateExpr(val));

        // If all elements are ValueExpr, return a ValueExpr array
        if (elements.every(e => e.type === 'value')) {
          return [envAfterArray, valueExpr(elements as ValueExpr[])];
        }

        // Otherwise keep as ArrayExpr
        return [envAfterArray, { type: 'array', values: elements }];
      }

      case "lambda":
        // Keep lambda as-is (parameters are unknown at compile-time)
        return [this, expr];

      default:
        throw new Error(
          `PartialEvalEnvironment.evaluateExpr cannot handle expression type: ${(expr as any).type}`,
        );
    }
  }

  /**
   * Override evaluate() to throw error - partial eval should use evaluateExpr.
   */
  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    throw new Error(
      "Use evaluateExpr() for partial evaluation. " +
        "evaluate() is only for standard full evaluation.",
    );
  }

  /**
   * Check if a variable is defined in the environment (compile-time value).
   */
  hasVariable(name: string): boolean {
    let current: EvalEnvState | undefined = this.state;
    while (current) {
      if (name in current.localVars) return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * Check if there is any data context (for PropertyExpr evaluation).
   * Returns false if current value is undefined or null (no data context).
   */
  hasDataContext(): boolean {
    const current = this.state.current;
    return current.value !== undefined && current.value !== null;
  }

  /**
   * Try to get a variable value if it exists.
   * Returns undefined if the variable is not found.
   */
  tryGetVariable(name: string): ValueExpr | undefined {
    return lookupVar(this.state, name);
  }

  protected newEnv(newState: EvalEnvState): EvalEnv {
    return new PartialEvalEnvironment(newState);
  }

  /**
   * Override withVariable to not evaluate the variable value.
   * In partial evaluation, we want to keep the raw EvalExpr until we know if it's fully evaluatable.
   */
  withVariable(name: string, expr: EvalExpr): EvalEnv {
    // For partial evaluation, if expr is a ValueExpr, use it directly
    // Otherwise, we can't add it as a variable (would need to be partially evaluated first)
    if (expr.type === "value") {
      return this.newEnv({
        data: this.state.data,
        current: this.state.current,
        compare: this.state.compare,
        localVars: { [name]: expr },
        parent: this.state,
        errors: this.state.errors,
      });
    }

    // If it's not a value, we can't add it to variables yet
    // This should not happen in partial evaluation since we partially evaluate bindings first
    throw new Error(
      "PartialEvalEnvironment.withVariable only accepts ValueExpr",
    );
  }

  withVariables(vars: [string, EvalExpr][]): EvalEnv {
    if (vars.length === 0) {
      return this;
    }

    if (vars.length === 1) {
      return this.withVariable(vars[0][0], vars[0][1]);
    }

    // Build up variables
    const newVars: Record<string, ValueExpr> = {};
    for (const [name, expr] of vars) {
      if (expr.type === "value") {
        newVars[name] = expr;
      } else {
        throw new Error(
          "PartialEvalEnvironment.withVariables only accepts ValueExpr",
        );
      }
    }

    return this.newEnv({
      data: this.state.data,
      current: this.state.current,
      compare: this.state.compare,
      localVars: newVars,
      parent: this.state,
      errors: this.state.errors,
    });
  }

  withCurrent(current: ValueExpr): EvalEnv {
    return this.newEnv({ ...this.state, current });
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
}

/**
 * Collect free variables in an expression (variables not bound by lambda/let in that expression).
 * Handles scoping correctly - lambda and let bindings shadow outer variables.
 */
function collectFreeVars(expr: EvalExpr, boundVars: Set<string> = new Set()): Set<string> {
  const freeVars = new Set<string>();

  function collect(e: EvalExpr, bound: Set<string>) {
    switch (e.type) {
      case "var":
        if (!bound.has(e.variable)) {
          freeVars.add(e.variable);
        }
        break;

      case "lambda": {
        // Lambda parameter shadows outer variables
        const innerBound = new Set(bound);
        innerBound.add(e.variable);
        collect(e.expr, innerBound);
        break;
      }

      case "let": {
        // Let bindings shadow outer variables
        const letBound = new Set(bound);
        for (const [v, _] of e.variables) {
          letBound.add(v.variable);
        }

        // Binding expressions see outer scope
        for (const [_, binding] of e.variables) {
          collect(binding, bound);
        }

        // Body sees let-bound variables
        collect(e.expr, letBound);
        break;
      }

      case "call":
        for (const arg of e.args) {
          collect(arg, bound);
        }
        break;

      case "array":
        for (const val of e.values) {
          collect(val, bound);
        }
        break;

      case "value":
        if (Array.isArray(e.value)) {
          for (const val of e.value) {
            collect(val, bound);
          }
        } else if (typeof e.value === "object" && e.value !== null) {
          for (const val of Object.values(e.value)) {
            if (val && typeof val === "object" && "type" in val) {
              collect(val as EvalExpr, bound);
            }
          }
        }
        break;

      case "property":
        // No variables to collect
        break;
    }
  }

  collect(expr, boundVars);
  return freeVars;
}

/**
 * Partially evaluates an expression given an environment with known values.
 * Returns a simplified expression tree with compile-time values substituted.
 */
export function partialEvaluate(
  env: PartialEvalEnvironment,
  expr: EvalExpr,
): EvalExpr {
  const [_, result] = env.evaluateExpr(expr);
  return result;
}
