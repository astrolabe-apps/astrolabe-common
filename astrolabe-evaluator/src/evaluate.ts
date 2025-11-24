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
  VarExpr,
  LetExpr,
  CallExpr,
  ArrayExpr,
  PropertyExpr,
  LambdaExpr,
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
  return alterEnv(
    e.withCurrent(value).evaluate(toEval),
    (e) => e.withCurrent(env.current!), // Safe because we're restoring original state
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

/**
 * Full evaluation that fails immediately with errors for unknown variables/functions.
 * Used by BasicEvalEnv for immediate, precise error reporting.
 */
export function defaultFullEvaluateExpr(
  env: EvalEnv,
  expr: EvalExpr,
): EnvValue<EvalExpr> {
  switch (expr.type) {
    case "var":
      const varExpr = env.getVariable(expr.variable);
      if (varExpr == null) {
        return [
          env.withError("Variable $" + expr.variable + " not declared"),
          valueExpr(null),
        ];
      }
      return env.evaluateExpr(varExpr);

    case "let":
      return env
        .withVariables(expr.variables.map(([v, e]) => [v.variable, e]))
        .evaluateExpr(expr.expr);

    case "value":
      return [env, expr];

    case "call":
      const funcCall = env.getVariable(expr.function);
      if (funcCall == null || funcCall.type !== "value" || !funcCall.function) {
        return [
          env.withError("Function $" + expr.function + " not declared"),
          valueExpr(null),
        ];
      }
      return funcCall.function.eval(env, expr);

    case "property":
      if (env.data === undefined || env.current === undefined) {
        return [
          env.withError(
            "Property " + expr.property + " cannot be accessed without data",
          ),
          valueExpr(null),
        ];
      }
      return env.evaluateExpr(env.data.getProperty(env.current, expr.property));

    case "array":
      return mapEnv(mapAllEnv(env, expr.values, doEvaluate), (v) => ({
        value: v,
        type: "value",
      }));

    default:
      throw "Can't evaluate this:" + expr.type;
  }
}

/**
 * Partial evaluation that returns symbolic expressions for unknown variables/functions.
 * Used by PartialEvalEnv for symbolic computation and deferred evaluation.
 */
export function defaultPartialEvaluateExpr(
  env: EvalEnv,
  expr: EvalExpr,
): EnvValue<EvalExpr> {
  switch (expr.type) {
    case "var":
      const varExpr = env.getVariable(expr.variable);
      if (varExpr == null) {
        // For partial evaluation, return the VarExpr itself (not error)
        return [env, expr];
      }
      // Detect self-referential bindings to prevent infinite recursion
      if (varExpr.type === "var" && varExpr.variable === expr.variable) {
        return [env, expr];
      }
      return env.evaluateExpr(varExpr);

    case "let": {
      // Partially evaluate all bindings
      let currentEnv = env;
      const keptBindings: [VarExpr, EvalExpr][] = [];

      for (const [varExpr, bindingExpr] of expr.variables) {
        const [nextEnv, partialBinding] = currentEnv.evaluateExpr(bindingExpr);

        // Only add inlinable bindings to environment
        // Complex expressions (CallExpr, ArrayExpr, PropertyExpr) are kept as let bindings
        if (isInlinableExpr(partialBinding)) {
          currentEnv = nextEnv.withVariable(varExpr.variable, partialBinding);
        } else {
          keptBindings.push([varExpr, partialBinding]);
          currentEnv = nextEnv;
        }
      }

      // Evaluate body with only inlinable bindings in scope
      const [bodyEnv, bodyResult] = currentEnv.evaluateExpr(expr.expr);

      // If body is fully evaluated and no bindings need to be kept, return it directly
      if (bodyResult.type === "value" && keptBindings.length === 0) {
        return [bodyEnv, bodyResult];
      }

      // Otherwise, return simplified let expression with kept bindings
      return [bodyEnv, simplifyLet(keptBindings, bodyResult, expr.location)];
    }

    case "value":
      return [env, expr];

    case "call":
      const funcCall = env.getVariable(expr.function);
      if (funcCall == null || funcCall.type !== "value" || !funcCall.function) {
        // For partial evaluation, return the CallExpr itself (not error)
        return [env, expr];
      }
      return funcCall.function.eval(env, expr);

    case "property":
      // Check for undefined data/current
      if (env.data === undefined || env.current === undefined) {
        return [env, expr]; // Return PropertyExpr unchanged
      }
      return env.evaluateExpr(env.data.getProperty(env.current, expr.property));

    case "array": {
      const [envAfter, partialValues] = mapAllEnv(
        env,
        expr.values,
        doEvaluateExpr,
      );
      // Check if all elements are fully evaluated
      const allFullyEvaluated = partialValues.every((v) => v.type === "value");
      if (allFullyEvaluated) {
        return [
          envAfter,
          {
            value: partialValues as ValueExpr[],
            type: "value",
          },
        ];
      }
      // At least one element is symbolic - return ArrayExpr
      return [envAfter, { type: "array", values: partialValues }];
    }

    default:
      throw "Can't evaluate this:" + expr.type;
  }
}

export function doEvaluate(env: EvalEnv, expr: EvalExpr) {
  return env.evaluate(expr);
}

export function doEvaluateExpr(env: EvalEnv, expr: EvalExpr) {
  return env.evaluateExpr(expr);
}

export function evaluateAll(e: EvalEnv, expr: EvalExpr[]) {
  return mapAllEnv(e, expr, doEvaluate);
}

/**
 * BasicEvalEnv performs full evaluation with immediate error reporting.
 * Based on main branch behavior - fails at exact error point.
 */
export class BasicEvalEnv extends EvalEnv {
  evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr> {
    return defaultFullEvaluateExpr(this, expr);
  }

  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    const [env, result] = this.evaluateExpr(expr);
    // Runtime check that result is a ValueExpr
    if (result.type !== "value") {
      throw new Error(
        `BasicEvalEnv.evaluate() expected ValueExpr but got ${result.type}. ` +
          `This indicates a bug in defaultFullEvaluateExpr.`,
      );
    }
    return [env, result];
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

  getVariable(name: string): EvalExpr | undefined {
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

    // Evaluate all variables sequentially, making each available to the next
    let currentEnv = this as EvalEnv;
    const evaluatedVars: Record<string, EvalExpr> = {};

    for (const [name, expr] of vars) {
      const [nextEnv, value] = currentEnv.evaluate(expr);
      evaluatedVars[name] = value;
      // Create environment with all variables evaluated so far
      // This allows subsequent variables to reference earlier ones
      currentEnv = this.newEnv({
        ...nextEnv.state,
        localVars: { ...evaluatedVars },
        parent: this.state,
      });
    }

    // Return the final environment that already has all variables
    return currentEnv;
  }

  withVariable(name: string, expr: EvalExpr): EvalEnv {
    const [nextEnv, value] = this.evaluate(expr);
    // Create a new child scope with this single variable
    // The new scope has empty localVars except for this variable
    // and points to the current scope as parent
    return this.newEnv({
      ...nextEnv.state,
      localVars: { [name]: value },
      parent: nextEnv.state, // Current state becomes parent
    });
  }

  withCurrent(current: ValueExpr): EvalEnv {
    return this.newEnv({ ...this.state, current });
  }
}

/**
 * PartialEvalEnv performs partial evaluation, returning symbolic expressions
 * for unknown variables and functions. Enables deferred evaluation and
 * symbolic computation.
 */
export class PartialEvalEnv extends EvalEnv {
  evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr> {
    return defaultPartialEvaluateExpr(this, expr);
  }

  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    throw new Error(
      "Cannot call evaluate() on PartialEvalEnv. " +
        "Use evaluateExpr() instead for partial evaluation. " +
        "evaluate() requires all expressions to be fully evaluated to ValueExpr.",
    );
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
    return new PartialEvalEnv(newState);
  }

  withError(error: string): EvalEnv {
    return this.newEnv({
      ...this.state,
      errors: [...this.state.errors, error],
    });
  }

  getVariable(name: string): EvalExpr | undefined {
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

    // Partially evaluate all variables sequentially, making each available to the next
    let currentEnv = this as EvalEnv;
    const partiallyEvaluatedVars: Record<string, EvalExpr> = {};

    for (const [name, expr] of vars) {
      const [nextEnv, partialResult] = currentEnv.evaluateExpr(expr);
      partiallyEvaluatedVars[name] = partialResult;
      // Create environment with all variables evaluated so far
      // This allows subsequent variables to reference earlier ones
      currentEnv = this.newEnv({
        ...nextEnv.state,
        localVars: { ...partiallyEvaluatedVars },
        parent: this.state,
      });
    }

    // Return the final environment that already has all variables
    return currentEnv;
  }

  withVariable(name: string, expr: EvalExpr): EvalEnv {
    const [nextEnv, partialResult] = this.evaluateExpr(expr);
    // Create a new child scope with this single variable
    // The new scope has empty localVars except for this variable
    // and points to the current scope as parent
    return this.newEnv({
      ...nextEnv.state,
      localVars: { [name]: partialResult },
      parent: nextEnv.state, // Current state becomes parent
    });
  }

  withCurrent(current: ValueExpr): EvalEnv {
    return this.newEnv({ ...this.state, current });
  }
}

// ============================================================================
// Partial Evaluation Simplification Helpers
// ============================================================================

/**
 * Find all free (unbound) variables in an expression.
 * Free variables are variable references that are not bound by a let or lambda.
 */
export function freeVariables(expr: EvalExpr): Set<string> {
  switch (expr.type) {
    case "var":
      return new Set([expr.variable]);

    case "let": {
      const bodyVars = freeVariables(expr.expr);
      // Remove variables bound in this let
      expr.variables.forEach(([v]) => bodyVars.delete(v.variable));
      // Add free variables from binding expressions
      expr.variables.forEach(([_, e]) => {
        freeVariables(e).forEach((v) => bodyVars.add(v));
      });
      return bodyVars;
    }

    case "call": {
      const vars = new Set<string>();
      // Function name might be a variable reference
      if (expr.function.startsWith("$")) {
        vars.add(expr.function);
      }
      expr.args.forEach((arg) => {
        freeVariables(arg).forEach((v) => vars.add(v));
      });
      return vars;
    }

    case "array": {
      const arrayVars = new Set<string>();
      expr.values.forEach((val) => {
        freeVariables(val).forEach((v) => arrayVars.add(v));
      });
      return arrayVars;
    }

    case "property":
      // PropertyExpr doesn't have an object field in current implementation
      // It references the current value from environment
      return new Set();

    case "value":
      return new Set();

    case "lambda": {
      const lambdaVars = freeVariables(expr.expr);
      // Lambda binds a single variable
      lambdaVars.delete(expr.variable);
      return lambdaVars;
    }

    default:
      return new Set();
  }
}

/**
 * Substitute all occurrences of a variable with a replacement expression.
 * Handles variable shadowing correctly.
 */
export function substitute(
  expr: EvalExpr,
  varName: string,
  replacement: EvalExpr,
): EvalExpr {
  switch (expr.type) {
    case "var":
      return expr.variable === varName ? replacement : expr;

    case "let": {
      // Check if any binding shadows the variable
      const shadowIndex = expr.variables.findIndex(
        ([v]) => v.variable === varName,
      );

      if (shadowIndex === -1) {
        // No shadowing - substitute in all bindings and body
        return {
          ...expr,
          variables: expr.variables.map(
            ([v, e]) =>
              [v, substitute(e, varName, replacement)] as [VarExpr, EvalExpr],
          ),
          expr: substitute(expr.expr, varName, replacement),
        };
      } else {
        // Variable is shadowed - only substitute in bindings before the shadow
        return {
          ...expr,
          variables: expr.variables.map(([v, e], i) =>
            i < shadowIndex
              ? ([v, substitute(e, varName, replacement)] as [
                  VarExpr,
                  EvalExpr,
                ])
              : [v, e],
          ),
          // Don't substitute in body - it's shadowed
        };
      }
    }

    case "call":
      return {
        ...expr,
        args: expr.args.map((arg) => substitute(arg, varName, replacement)),
      };

    case "array":
      return {
        ...expr,
        values: expr.values.map((val) => substitute(val, varName, replacement)),
      };

    case "property":
      // PropertyExpr doesn't have fields to substitute
      return expr;

    case "lambda":
      // Check if parameter shadows the variable
      if (expr.variable === varName) {
        return expr; // Shadowed, don't substitute
      }
      return {
        ...expr,
        expr: substitute(expr.expr, varName, replacement),
      };

    case "value":
      return expr;

    default:
      return expr;
  }
}

/**
 * Check if a value is simple enough to inline (constant propagation).
 */
function isSimpleValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  );
}

/**
 * Check if an expression should be inlined during partial evaluation.
 * Returns true for:
 * - ValueExpr (all fully evaluated values, simple or complex)
 * - VarExpr (simple variable references)
 * Returns false for symbolic expressions that should be kept as let bindings:
 * - CallExpr, ArrayExpr, PropertyExpr, LetExpr, LambdaExpr
 */
function isInlinableExpr(expr: EvalExpr): boolean {
  if (expr.type === "value") {
    return true; // All ValueExprs are inlinable
  }
  if (expr.type === "var") {
    return true; // Inline simple variable references
  }
  return false; // Keep symbolic expressions as let bindings
}

/**
 * Simplify a let expression by:
 * - Eliminating unused variables (dead code elimination)
 * - Inlining simple constant values (constant propagation)
 * - Flattening when no bindings remain
 *
 * Called from the let case in defaultPartialEvaluate when the body
 * cannot be fully evaluated to a ValueExpr.
 */
export function simplifyLet(
  partialBindings: [VarExpr, EvalExpr][],
  bodyResult: EvalExpr,
  location?: any,
): EvalExpr {
  // Find all variables that are used, including transitive dependencies
  // Start with variables used in the body
  let usedVars = freeVariables(bodyResult);

  // Keep adding variables that are used in the bindings of already-used variables
  // until no new variables are found (fixed-point iteration)
  let changed = true;
  while (changed) {
    changed = false;
    for (const [varExpr, partialResult] of partialBindings) {
      const varName = varExpr.variable;
      // If this binding is used, mark all variables it references as used too
      if (usedVars.has(varName)) {
        const bindingVars = freeVariables(partialResult);
        for (const bindingVar of bindingVars) {
          if (!usedVars.has(bindingVar)) {
            usedVars.add(bindingVar);
            changed = true;
          }
        }
      }
    }
  }

  const relevantBindings: [VarExpr, EvalExpr][] = [];
  const inlineBindings = new Map<string, EvalExpr>();

  for (const [varExpr, partialResult] of partialBindings) {
    const varName = varExpr.variable;

    // Dead variable elimination - skip if not used (directly or indirectly)
    if (!usedVars.has(varName)) {
      continue;
    }

    // Constant propagation - inline simple values
    if (partialResult.type === "value" && isSimpleValue(partialResult.value)) {
      inlineBindings.set(varName, partialResult);
    } else {
      relevantBindings.push([varExpr, partialResult]);
    }
  }

  // Apply inlining to body
  let simplifiedBody = bodyResult;
  inlineBindings.forEach((replacement, varName) => {
    simplifiedBody = substitute(simplifiedBody, varName, replacement);
  });

  // Let flattening - if no bindings remain, return the simplified body
  if (relevantBindings.length === 0) {
    return simplifiedBody;
  }

  // Return simplified let expression
  return {
    type: "let",
    variables: relevantBindings,
    expr: simplifiedBody,
    location,
  };
}
