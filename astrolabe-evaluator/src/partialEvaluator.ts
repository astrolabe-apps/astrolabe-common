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
   * Override evaluate to only accept fully-evaluated ValueExpr and CallExpr with all ValueExpr arguments.
   * This allows calling function handlers during partial evaluation.
   */
  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    if (expr.type === "value") {
      return [this, expr];
    }

    if (
      expr.type === "call" &&
      expr.args.every((arg) => arg.type === "value")
    ) {
      // Check if the function exists
      const funcValue = this.getVariable(expr.function);
      if (funcValue && funcValue.function) {
        // All arguments are ValueExpr - can call function handler
        return defaultEvaluate(this, expr);
      }
      // Function doesn't exist - throw error
      throw new Error(
        `Function ${expr.function} not found in PartialEvalEnvironment`,
      );
    }

    throw new Error(
      "PartialEvalEnvironment.evaluate only accepts ValueExpr or CallExpr with all ValueExpr arguments. " +
        "Use partialEvaluate function for partial evaluation.",
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
 * Partially evaluates an expression given an environment with known values.
 * Returns a simplified expression tree with compile-time values substituted.
 */
export function partialEvaluate(
  env: PartialEvalEnvironment,
  expr: EvalExpr,
): EvalExpr {
  return partialEvaluateExpr(env, expr);
}

function isFullyEvaluated(expr: EvalExpr): boolean {
  return expr.type === "value";
}

function partialEvaluateExpr(
  env: PartialEvalEnvironment,
  expr: EvalExpr,
): EvalExpr {
  switch (expr.type) {
    case "value":
      return expr;

    case "var":
      return partialEvaluateVar(env, expr);

    case "property":
      return partialEvaluateProperty(env, expr);

    case "call":
      if (expr.function === "?") {
        return partialEvaluateTernary(env, expr);
      } else if (expr.function === ".") {
        return partialEvaluateFlatMap(env, expr);
      } else {
        return partialEvaluateCall(env, expr);
      }

    case "array":
      return partialEvaluateArray(env, expr);

    case "let":
      return partialEvaluateLet(env, expr);

    case "lambda":
      return partialEvaluateLambda(env, expr);

    default:
      return expr;
  }
}

function partialEvaluateVar(
  env: PartialEvalEnvironment,
  varExpr: VarExpr,
): EvalExpr {
  const value = env.tryGetVariable(varExpr.variable);
  if (value) {
    // Variable is defined with a compile-time value
    return value;
  }

  // Variable not found - keep as VarExpr (will be runtime value)
  return varExpr;
}

function partialEvaluateProperty(
  env: PartialEvalEnvironment,
  propExpr: PropertyExpr,
): EvalExpr {
  // Check if there's any data context at all
  if (!env.hasDataContext()) {
    // No data context - this is a runtime field
    return propExpr;
  }

  // There's data context - evaluate the property access
  const current = env.state.current;

  if (
    typeof current.value === "object" &&
    current.value !== null &&
    !Array.isArray(current.value)
  ) {
    const obj = current.value as Record<string, ValueExpr>;
    // Try to get the property value
    if (propExpr.property in obj) {
      return obj[propExpr.property];
    }
    // Property doesn't exist - return null ValueExpr
    return valueExpr(null);
  }

  // Current value is not an object - can't access property
  return valueExpr(null);
}

function partialEvaluateFlatMap(
  env: PartialEvalEnvironment,
  ce: CallExpr,
): EvalExpr {
  // ce.args = [left, right] for the . operator
  const left = partialEvaluateExpr(env, ce.args[0]);
  const right = ce.args[1];

  // If left is fully evaluated to an object, update the environment's current context
  if (
    left.type === "value" &&
    typeof left.value === "object" &&
    left.value !== null &&
    !Array.isArray(left.value)
  ) {
    // Update environment with this value as current context
    const newEnv = env.withCurrent(left) as PartialEvalEnvironment;
    // Partially evaluate the right side with the new context
    return partialEvaluateExpr(newEnv, right);
  }

  // If left is fully evaluated to an array, we need to map over it
  if (left.type === "value" && Array.isArray(left.value)) {
    const partialRight = partialEvaluateExpr(env, right);
    if (isFullyEvaluated(partialRight)) {
      // Both sides evaluated, can try to execute
      try {
        const reconstructed: CallExpr = {
          type: "call",
          function: ".",
          args: [left, partialRight],
          location: ce.location,
        };
        const [, result] = env.evaluate(reconstructed);
        return result;
      } catch {
        // Fall through to return CallExpr
      }
    }
    return {
      type: "call",
      function: ".",
      args: [left, partialRight],
      location: ce.location,
    };
  }

  // If left is null/undefined, return it
  if (
    left.type === "value" &&
    (left.value === null || left.value === undefined)
  ) {
    return left;
  }

  // Otherwise, partially evaluate right and reconstruct
  const simplifiedRight = partialEvaluateExpr(env, right);
  return {
    type: "call",
    function: ".",
    args: [left, simplifiedRight],
    location: ce.location,
  };
}

function partialEvaluateTernary(
  env: PartialEvalEnvironment,
  ce: CallExpr,
): EvalExpr {
  // ce.args = [condition, trueBranch, falseBranch]
  const condition = partialEvaluateExpr(env, ce.args[0]);

  if (condition.type === "value") {
    // Condition is known - pick the appropriate branch
    const isTrue =
      condition.value === null || condition.value === undefined
        ? false
        : typeof condition.value === "boolean"
          ? condition.value
          : true;

    const selectedBranch = isTrue ? ce.args[1] : ce.args[2];
    return partialEvaluateExpr(env, selectedBranch);
  } else {
    // Condition is unknown - simplify all three parts
    const trueBranch = partialEvaluateExpr(env, ce.args[1]);
    const falseBranch = partialEvaluateExpr(env, ce.args[2]);
    return {
      type: "call",
      function: "?",
      args: [condition, trueBranch, falseBranch],
      location: ce.location,
    };
  }
}

function partialEvaluateCall(
  env: PartialEvalEnvironment,
  ce: CallExpr,
): EvalExpr {
  // Partially evaluate all arguments
  const partialArgs = ce.args.map((arg) => partialEvaluateExpr(env, arg));

  // If all arguments are fully evaluated, try to execute the function
  if (partialArgs.every(isFullyEvaluated)) {
    // Check if the function exists before trying to evaluate
    const funcValue = env.getVariable(ce.function);
    if (funcValue && funcValue.function) {
      const reconstructed: CallExpr = {
        type: "call",
        function: ce.function,
        args: partialArgs,
        location: ce.location,
      };

      try {
        const [, result] = env.evaluate(reconstructed);
        return result;
      } catch (e) {
        // Evaluation failed - keep as call expression
      }
    }
  }

  // Reconstruct with simplified arguments
  return {
    type: "call",
    function: ce.function,
    args: partialArgs,
    location: ce.location,
  };
}

function partialEvaluateArray(
  env: PartialEvalEnvironment,
  ae: ArrayExpr,
): EvalExpr {
  const partialElements = ae.values.map((v) => partialEvaluateExpr(env, v));

  // If all elements are fully evaluated, create an array ValueExpr
  if (partialElements.every(isFullyEvaluated)) {
    return valueExpr(partialElements as ValueExpr[]);
  }

  // Otherwise, keep as ArrayExpr with simplified elements
  return {
    type: "array",
    values: partialElements,
    location: ae.location,
  };
}

function partialEvaluateLet(
  env: PartialEvalEnvironment,
  le: LetExpr,
): EvalExpr {
  // Partially evaluate each binding and extend the environment
  let newEnv = env;
  const newVars: [VarExpr, EvalExpr][] = [];

  for (const [varExpr, bindingExpr] of le.variables) {
    const partialBinding = partialEvaluateExpr(newEnv, bindingExpr);

    if (partialBinding.type === "value") {
      // Binding is fully evaluated - add to environment for future lookups
      newEnv = newEnv.withVariable(
        varExpr.variable,
        partialBinding,
      ) as PartialEvalEnvironment;
    } else {
      // Binding has runtime dependencies - keep in let expression
      newVars.push([varExpr, partialBinding]);
    }
  }

  // Partially evaluate the body with the extended environment
  const partialBody = partialEvaluateExpr(newEnv, le.expr);

  // If no variables remain, just return the body
  if (newVars.length === 0) {
    return partialBody;
  }

  // Reconstruct let expression with remaining variables
  return {
    type: "let",
    variables: newVars,
    expr: partialBody,
    location: le.location,
  };
}

function partialEvaluateLambda(
  env: PartialEvalEnvironment,
  lambda: LambdaExpr,
): EvalExpr {
  // Lambda parameters are unknown at compile-time, but we can still partially
  // evaluate the body using the compile-time values available in the environment

  // The lambda parameter ($x, $i, etc.) is an unknown runtime value
  // We don't add it to the environment, so references to it will remain as VarExpr

  // Partially evaluate the lambda body
  const partialBody = partialEvaluateExpr(env, lambda.expr);

  // If the body hasn't changed, return the original lambda
  if (partialBody === lambda.expr) {
    return lambda;
  }

  // Reconstruct lambda with simplified body
  return {
    type: "lambda",
    variable: lambda.variable,
    expr: partialBody,
    location: lambda.location,
  };
}
