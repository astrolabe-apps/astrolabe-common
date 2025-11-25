import {
  compareSignificantDigits,
  EmptyPath,
  EvalEnv,
  EvalExpr,
  getPropertyFromValue,
  SourceLocation,
  toValue,
  valueExpr,
  ValueExpr,
  valueExprWithError,
} from "./ast";

/**
 * BasicEvalEnv performs full evaluation with lazy variable evaluation and memoization.
 * Variables are stored unevaluated and cached on first access.
 */
export class BasicEvalEnv extends EvalEnv {
  private localVars: Record<string, EvalExpr>;
  private evalCache = new Map<string, EvalExpr>();

  constructor(
    localVars: Record<string, EvalExpr>,
    private parent: BasicEvalEnv | undefined,
    public readonly compare: (v1: unknown, v2: unknown) => number,
  ) {
    super();
    this.localVars = localVars;
  }

  /**
   * Evaluate a variable by name with caching.
   * Each scope only caches its own local variables.
   */
  private evaluateVariable(name: string, location?: SourceLocation): EvalExpr {
    // If var is in THIS scope, check/update THIS cache
    if (name in this.localVars) {
      const cached = this.evalCache.get(name);
      if (cached) return cached;

      const binding = this.localVars[name];
      const result = this.evaluateExpr(binding);
      this.evalCache.set(name, result);
      return result;
    }
    // Delegate to parent - parent caches its own vars
    if (this.parent) {
      return this.parent.evaluateVariable(name, location);
    }
    return valueExprWithError(null, `Variable $${name} not declared`, {
      location,
    });
  }

  newScope(vars: Record<string, EvalExpr>): BasicEvalEnv {
    if (Object.keys(vars).length === 0) return this;
    return new BasicEvalEnv(vars, this, this.compare);
  }

  getCurrentValue(): EvalExpr | undefined {
    // Check if _ is defined in this scope or parent scopes
    if ("_" in this.localVars) {
      return this.evaluateVariable("_");
    }
    return this.parent?.getCurrentValue();
  }

  evaluateExpr(expr: EvalExpr): EvalExpr {
    switch (expr.type) {
      case "var":
        return this.evaluateVariable(expr.variable, expr.location);

      case "let": {
        // Create scope with unevaluated bindings
        const bindings: Record<string, EvalExpr> = {};
        for (const [v, e] of expr.variables) {
          bindings[v.variable] = e;
        }
        return this.newScope(bindings).evaluateExpr(expr.expr);
      }

      case "value":
        return expr;

      case "call": {
        const funcExpr = this.evaluateVariable(expr.function, expr.location);
        if (funcExpr.type !== "value" || !funcExpr.function) {
          return valueExprWithError(
            null,
            "Function " + expr.function + " not declared or not a function",
            { location: expr.location },
          );
        }
        return funcExpr.function.eval(this, expr);
      }

      case "property": {
        const currentValue = this.getCurrentValue();
        if (!currentValue || currentValue.type !== "value") {
          return valueExprWithError(
            null,
            "Property " + expr.property + " cannot be accessed without data",
            { location: expr.location },
          );
        }
        return this.evaluateExpr(
          getPropertyFromValue(currentValue, expr.property),
        );
      }

      case "array": {
        const results = expr.values.map((v) => this.evaluateExpr(v));
        // All results should be ValueExpr in full evaluation
        return {
          type: "value",
          value: results as ValueExpr[],
        };
      }

      case "lambda":
        // Lambdas are evaluated when called, not here
        return valueExprWithError(
          null,
          "Lambda expressions cannot be evaluated directly",
          { location: expr.location },
        );

      default:
        throw new Error("Can't evaluate: " + (expr as any).type);
    }
  }
}

/**
 * Create a BasicEvalEnv with root data and standard functions.
 * Root data is bound to the `_` variable.
 */
export function createBasicEnv(
  root?: unknown,
  functions: Record<string, EvalExpr> = {},
): BasicEvalEnv {
  const rootValue = root !== undefined ? toValue(EmptyPath, root) : undefined;
  // Bind root data to `_` variable along with functions
  const vars =
    rootValue !== undefined ? { ...functions, _: rootValue } : functions;
  return new BasicEvalEnv(vars, undefined, compareSignificantDigits(5));
}

/**
 * Evaluates an expression with a value bound to a lambda variable and `_`.
 * Used by map/filter functions that iterate over arrays.
 */
export function evaluateWith(
  env: BasicEvalEnv,
  value: ValueExpr,
  ind: number | null,
  expr: EvalExpr,
): ValueExpr {
  const bindValue = valueExpr(ind);
  const [e, toEval] = checkLambda();
  // Bind _ to value via newScope instead of withCurrent
  const result = e.newScope({ _: value }).evaluateExpr(toEval);
  if (result.type !== "value") {
    throw new Error(`evaluateWith expected ValueExpr but got ${result.type}`);
  }
  return result;

  function checkLambda(): [BasicEvalEnv, EvalExpr] {
    switch (expr.type) {
      case "lambda":
        return [env.newScope({ [expr.variable]: bindValue }), expr.expr];
      default:
        return [env, expr];
    }
  }
}

/**
 * Static helper function to validate full evaluation to ValueExpr.
 * Throws if the result is not a ValueExpr.
 *
 * @param env - The evaluation environment
 * @param expr - The expression to evaluate
 * @returns The fully evaluated ValueExpr
 */
export function evaluate(env: EvalEnv, expr: EvalExpr): ValueExpr {
  const result = env.evaluateExpr(expr);
  if (result.type !== "value") {
    throw new Error(
      `Expression did not fully evaluate. Got ${result.type} instead of ValueExpr.`,
    );
  }
  return result;
}
