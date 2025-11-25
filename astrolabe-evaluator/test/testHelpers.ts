import { EvalEnv, EvalExpr, ValueExpr, toNative } from "../src/ast";
import { basicEnv } from "../src/defaultFunctions";
import { parseEval } from "../src/parseEval";

/**
 * Evaluate an expression and return just the result.
 * Use for tests that only care about the computed value.
 *
 * @param env - The evaluation environment
 * @param expr - The expression to evaluate
 * @returns The evaluated result
 */
export function evalResult(env: EvalEnv, expr: EvalExpr): ValueExpr {
  const [_, result] = env.evaluate(expr);
  return result;
}

export function evalPartial(env: EvalEnv, expr: EvalExpr): EvalExpr {
  const [_, result] = env.evaluateExpr(expr);
  return result;
}

/**
 * Evaluate an expression and return result with errors.
 * Use for tests that need to check error conditions.
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
  const [nextEnv, result] = env.evaluate(expr);
  return { result, errors: nextEnv.errors };
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
  const [_, result] = env.evaluate(parsed);
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
  const [_, result] = env.evaluate(parsed);
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
  const [_, result] = env.evaluate(parsed);
  const nativeResult = toNative(result);
  if (!Array.isArray(nativeResult)) {
    throw new Error("Expected array result");
  }
  return nativeResult as unknown[];
}
