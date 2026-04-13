import {
  arrayExpr,
  BasicEvalEnv,
  callExpr,
  CallExpr,
  collectAllErrors,
  compareSignificantDigits,
  createBasicEnv,
  EmptyPath,
  EvalEnv,
  EvalExpr,
  extractAllPaths,
  lambdaExpr,
  Path,
  toValue,
  valueExpr,
  ValueExpr,
  valueExprWithDeps,
  defaultFunctions,
} from "@astroapps/evaluator";
import { EvaluatedRule, Failure, isValidationData, ValidationData } from "./types";
import { ForEachRule, MultiRule, Rule, SingleRule } from "./rule";

export const RULE_FUNCTION = "ValidatorRule";

/**
 * Type for function handlers in the evaluator.
 */
type FunctionHandler = (env: EvalEnv, call: CallExpr) => EvalExpr;

/**
 * Wrap a comparison function to track failures when result is false.
 */
function wrapValidation(
  handler: FunctionHandler,
  funcName: string,
): FunctionHandler {
  return (env, call) => {
    const result = handler(env, call);

    if (result.type !== "value" || (result as ValueExpr).value !== false) {
      return result;
    }

    const ve = result as ValueExpr;
    // Evaluate args to capture in failure record
    const evaledArgs = call.args
      .map((arg) => env.evaluateExpr(arg))
      .filter((r): r is ValueExpr => r.type === "value");

    const failure: Failure = { call, evaluatedArgs: evaledArgs };
    const validationData: ValidationData = { failures: [failure] };

    // Attach validation data, preserve existing deps
    return {
      ...ve,
      data: validationData,
    };
  };
}

/**
 * WithMessage($msg, $expr) - evaluate expr with message context.
 */
const withMessageHandler: FunctionHandler = (env, call) => {
  if (call.args.length !== 2) {
    return valueExpr(null, undefined, call.location);
  }

  const msgResult = env.evaluateExpr(call.args[0]);
  const exprResult = env.evaluateExpr(call.args[1]);

  if (exprResult.type !== "value") {
    return exprResult;
  }

  const ve = exprResult as ValueExpr;
  const message =
    msgResult.type === "value" ? ((msgResult as ValueExpr).value as string) : undefined;
  const existingData = isValidationData(ve.data)
    ? ve.data
    : { failures: [] as Failure[] };

  const deps = [...(ve.deps || [])];
  if (msgResult.type === "value") {
    deps.push(msgResult as ValueExpr);
  }

  return {
    ...ve,
    data: { ...existingData, message },
    deps: deps.length > 0 ? deps : undefined,
  };
};

/**
 * WithProperty($key, $value, $expr) - add property to context.
 */
const withPropertyHandler: FunctionHandler = (env, call) => {
  if (call.args.length !== 3) {
    return valueExpr(null, undefined, call.location);
  }

  const keyResult = env.evaluateExpr(call.args[0]);
  const valueResult = env.evaluateExpr(call.args[1]);
  const exprResult = env.evaluateExpr(call.args[2]);

  if (exprResult.type !== "value") {
    return exprResult;
  }

  const ve = exprResult as ValueExpr;
  const key =
    keyResult.type === "value" ? ((keyResult as ValueExpr).value as string) : undefined;
  const value =
    valueResult.type === "value" ? (valueResult as ValueExpr).value : undefined;

  const existingData = isValidationData(ve.data)
    ? ve.data
    : { failures: [] as Failure[] };
  const props = existingData.properties || {};

  const newProps = key !== undefined ? { ...props, [key]: value } : props;

  return {
    ...ve,
    data: { ...existingData, properties: newProps },
  };
};

/**
 * ValidatorRule($path, $must, $props) - evaluate rule and collect results.
 */
const validatorRuleHandler: FunctionHandler = (env, call) => {
  if (call.args.length < 2) {
    return valueExpr(null, undefined, call.location);
  }

  const pathResult = env.evaluateExpr(call.args[0]);
  const mustResult = env.evaluateExpr(call.args[1]);

  // Evaluate props if provided (3rd argument)
  const propsResult =
    call.args.length > 2 ? env.evaluateExpr(call.args[2]) : undefined;

  if (pathResult.type !== "value" || mustResult.type !== "value") {
    return valueExpr(null, undefined, call.location);
  }

  const pathVal = pathResult as ValueExpr;
  const mustVal = mustResult as ValueExpr;

  // Collect all validation data from the must expression tree
  const validationData = collectValidationData(mustVal);

  // Merge properties from props expression (if any)
  let properties = validationData.properties || {};
  if (
    propsResult?.type === "value" &&
    isValidationData((propsResult as ValueExpr).data)
  ) {
    const propsData = (propsResult as ValueExpr).data as ValidationData;
    if (propsData.properties) {
      properties = { ...properties, ...propsData.properties };
    }
  }

  // Collect all errors from the must expression tree
  const errors = collectAllErrors(mustVal);

  // Create EvaluatedRule record
  const rule: EvaluatedRule = {
    path: pathVal.path ?? EmptyPath,
    pathValue: pathVal.value,
    result: mustVal,
    failures: validationData.failures,
    errors,
    message: validationData.message,
    dependentData: extractAllPaths(mustVal),
    properties,
  };

  // Return path value with rule attached (for chaining)
  return {
    ...pathVal,
    data: rule,
    deps: [mustVal],
  };
};

/**
 * Collect all validation data from a ValueExpr tree.
 * Mirrors CollectAllErrors/ExtractAllPaths patterns.
 */
export function collectValidationData(expr: ValueExpr): ValidationData {
  const failures: Failure[] = [];
  let message: string | undefined;
  let properties: Record<string, unknown> = {};
  const seen = new Set<ValueExpr>();

  function collect(ve: ValueExpr) {
    if (seen.has(ve)) return; // Cycle detection
    seen.add(ve);

    if (isValidationData(ve.data)) {
      failures.push(...ve.data.failures);
      if (ve.data.message !== undefined && message === undefined) {
        message = ve.data.message; // First message wins
      }
      if (ve.data.properties) {
        properties = { ...properties, ...ve.data.properties };
      }
    }

    if (!ve.deps) return;
    for (const dep of ve.deps) {
      collect(dep);
    }
  }

  collect(expr);
  return { failures, message, properties };
}

/**
 * Create a validator environment with wrapped comparison functions.
 */
export function createValidatorEnv(
  data?: unknown,
  compare?: (v1: unknown, v2: unknown) => number,
): BasicEvalEnv {
  const functions: Record<string, EvalExpr> = {};

  // Add default functions with validation wrappers for comparisons
  for (const [name, handler] of Object.entries(defaultFunctions)) {
    const funcValue = handler as ValueExpr;
    if (funcValue.function) {
      const wrappedHandler =
        name === "=" ||
        name === "!=" ||
        name === ">" ||
        name === "<" ||
        name === ">=" ||
        name === "<=" ||
        name === "notEmpty"
          ? wrapValidation(funcValue.function.eval, name)
          : funcValue.function.eval;

      functions[name] = {
        type: "value",
        function: {
          eval: wrappedHandler,
          getType: funcValue.function.getType,
        },
      };
    } else {
      functions[name] = funcValue;
    }
  }

  // Add validator-specific functions
  functions[RULE_FUNCTION] = {
    type: "value",
    function: {
      eval: validatorRuleHandler,
      getType: (e) => ({ env: e, value: { type: "any" } }),
    },
  };
  functions["WithMessage"] = {
    type: "value",
    function: {
      eval: withMessageHandler,
      getType: (e) => ({ env: e, value: { type: "any" } }),
    },
  };
  functions["WithProperty"] = {
    type: "value",
    function: {
      eval: withPropertyHandler,
      getType: (e) => ({ env: e, value: { type: "any" } }),
    },
  };

  const rootValue = data !== undefined ? toValue(EmptyPath, data) : undefined;
  const vars = rootValue !== undefined ? { ...functions, _: rootValue } : functions;

  return new BasicEvalEnv(
    vars,
    undefined,
    compare ?? compareSignificantDigits(5),
  );
}

/**
 * Validate data against a rule.
 */
export function validateData(
  data: unknown,
  rule: Rule,
  variables?: Record<string, EvalExpr>,
): EvaluatedRule[] {
  const env = createValidatorEnv(data);
  return validateRules(env, rule, variables);
}

/**
 * Validate rules using an existing environment.
 */
export function validateRules(
  baseEnv: BasicEvalEnv,
  rule: Rule,
  variables?: Record<string, EvalExpr>,
): EvaluatedRule[] {
  let ruleExpr = toExpr(rule);

  if (variables && Object.keys(variables).length > 0) {
    // Wrap with let expression for variables
    const varAssigns: [{ type: "var"; variable: string }, EvalExpr][] =
      Object.entries(variables).map(([name, expr]) => [
        { type: "var", variable: name },
        expr,
      ]);
    ruleExpr = { type: "let", variables: varAssigns, expr: ruleExpr };
  }

  const result = baseEnv.evaluateExpr(ruleExpr);

  // Collect all rules from result tree
  return collectRules(result.type === "value" ? (result as ValueExpr) : undefined);
}

/**
 * Collect all EvaluatedRule instances from a ValueExpr tree.
 */
function collectRules(expr: ValueExpr | undefined): EvaluatedRule[] {
  if (!expr) return [];

  const rules: EvaluatedRule[] = [];
  const seen = new Set<ValueExpr>();

  function collect(ve: ValueExpr) {
    if (seen.has(ve)) return;
    seen.add(ve);

    if (isEvaluatedRule(ve.data)) {
      rules.push(ve.data);
    }

    // Also check array values
    if (Array.isArray(ve.value)) {
      for (const elem of ve.value as ValueExpr[]) {
        collect(elem);
      }
    }

    if (!ve.deps) return;
    for (const dep of ve.deps) {
      collect(dep);
    }
  }

  collect(expr);
  return rules;
}

/**
 * Type guard for EvaluatedRule.
 */
function isEvaluatedRule(data: unknown): data is EvaluatedRule {
  return (
    typeof data === "object" &&
    data !== null &&
    "path" in data &&
    "failures" in data &&
    "result" in data
  );
}

/**
 * Convert a Rule to an EvalExpr for evaluation.
 */
function toExpr(rule: Rule): EvalExpr {
  switch (rule.type) {
    case "single":
      return toSingleExpr(rule);
    case "multi":
      return toMultiExpr(rule);
    case "forEach":
      return toForEachExpr(rule);
  }
}

function toSingleExpr(rule: SingleRule): EvalExpr {
  return callExpr(RULE_FUNCTION, [rule.path, rule.must, rule.props]);
}

function toMultiExpr(rule: MultiRule): EvalExpr {
  return arrayExpr(rule.rules.map(toExpr));
}

function toForEachExpr(rule: ForEachRule): EvalExpr {
  let ruleExpr = toExpr(rule.rule);

  if (rule.variables) {
    ruleExpr = { ...rule.variables, expr: ruleExpr };
  }

  return callExpr(".", [rule.path, lambdaExpr(rule.index.variable, ruleExpr)]);
}
