import { CallExpr, Path, ValueExpr } from "@astroapps/evaluator";

/**
 * Records a validation failure with the function call that failed
 * and its evaluated arguments.
 */
export interface Failure {
  call: CallExpr;
  evaluatedArgs: ValueExpr[];
}

/**
 * Validation metadata accumulated during rule evaluation.
 * Stored in ValueExpr.data and collected at the end.
 */
export type ValidationData = {
  failures: Failure[];
  message?: string;
  properties?: Record<string, unknown>;
};

/**
 * Complete validation result for a single rule.
 */
export type EvaluatedRule = {
  /** The data path that was validated */
  path: Path;
  /** The actual value at the path */
  pathValue: unknown;
  /** The complete evaluation result */
  result: ValueExpr;
  /** All failures from the validation */
  failures: Failure[];
  /** Error messages from expression evaluation */
  errors: string[];
  /** Custom error message (if set via WithMessage) */
  message?: string;
  /** Fields that the rule depends on */
  dependentData: Path[];
  /** Metadata properties (set via WithProperty) */
  properties: Record<string, unknown>;
};

/**
 * Type guard to check if an object is ValidationData.
 */
export function isValidationData(data: unknown): data is ValidationData {
  return (
    typeof data === "object" &&
    data !== null &&
    "failures" in data &&
    Array.isArray((data as ValidationData).failures)
  );
}

/**
 * Get a typed property from an EvaluatedRule.
 */
export function getProperty<T>(
  rule: EvaluatedRule,
  key: string,
): T | undefined {
  const value = rule.properties[key];
  return value as T | undefined;
}
