import {
  EvalEnv,
  EvalExpr,
  ValueExpr,
  toNative,
  collectAllErrors,
} from "../src/ast";
import { basicEnv } from "../src/defaultFunctions";
import { parseEval } from "../src/parseEval";
import { PartialEvalEnv } from "../src";

/**
 * Evaluate an expression and return just the result.
 * Use for tests that only care about the computed value.
 *
 * @param env - The evaluation environment
 * @param expr - The expression to evaluate
 * @returns The evaluated result
 */
export function evalResult(env: EvalEnv, expr: EvalExpr): ValueExpr {
  const result = env.evaluateExpr(expr);
  if (result.type !== "value") {
    throw new Error(
      `Expected ValueExpr but got ${result.type}. Expression did not fully evaluate.`,
    );
  }
  return result;
}

export function evalPartial(env: PartialEvalEnv, expr: EvalExpr): EvalExpr {
  return env.uninline(env.evaluateExpr(expr));
}

/**
 * Evaluate an expression and return result with errors.
 * Use for tests that need to check error conditions.
 * Collects errors from the ValueExpr.errors field.
 *
 * @param env - The evaluation environment
 * @param expr - The expression to evaluate
 * @returns Object containing the result and any errors
 */
export function evalWithErrors(
  env: EvalEnv,
  expr: EvalExpr,
): {
  result: ValueExpr;
  errors: string[];
} {
  const result = env.evaluateExpr(expr);
  if (result.type !== "value") {
    throw new Error(
      `Expected ValueExpr but got ${result.type}. Expression did not fully evaluate.`,
    );
  }
  const errors = collectAllErrors(result);
  return { result, errors };
}

/**
 * Evaluate a string expression with data context (convenience wrapper).
 * Use for simple integration tests.
 *
 * @param expr - The expression string to parse and evaluate
 * @param data - Optional data context for the evaluation
 * @returns The native JavaScript value of the result
 */
export function evalExpr(expr: string, data: unknown = {}): unknown {
  const env = basicEnv(data);
  const parsed = parseEval(expr);
  const result = env.evaluateExpr(parsed);
  if (result.type !== "value") {
    throw new Error(
      `Expected ValueExpr but got ${result.type}. Expression did not fully evaluate.`,
    );
  }
  return result.value;
}

/**
 * Evaluate a string expression and convert result to native JS.
 * Use for tests expecting native JS values (not ValueExpr).
 *
 * @param expr - The expression string to parse and evaluate
 * @param data - Optional data context for the evaluation
 * @returns The native JavaScript representation of the result
 */
export function evalExprNative(expr: string, data: unknown = {}): unknown {
  const env = basicEnv(data);
  const parsed = parseEval(expr);
  const result = env.evaluateExpr(parsed);
  if (result.type !== "value") {
    throw new Error(
      `Expected ValueExpr but got ${result.type}. Expression did not fully evaluate.`,
    );
  }
  return toNative(result);
}

/**
 * Evaluate a string expression and return result as array.
 * Use for tests expecting array results.
 *
 * @param expr - The expression string to parse and evaluate
 * @param data - Optional data context for the evaluation
 * @returns The result as an array, throws if result is not an array
 */
export function evalToArray(expr: string, data: unknown = {}): unknown[] {
  const env = basicEnv(data);
  const parsed = parseEval(expr);
  const result = env.evaluateExpr(parsed);
  if (result.type !== "value") {
    throw new Error(
      `Expected ValueExpr but got ${result.type}. Expression did not fully evaluate.`,
    );
  }
  const nativeResult = toNative(result);
  if (!Array.isArray(nativeResult)) {
    throw new Error("Expected array result");
  }
  return nativeResult as unknown[];
}
