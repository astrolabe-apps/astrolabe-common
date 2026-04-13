import {
  callExpr,
  EvalExpr,
  LetExpr,
  NullExpr,
  valueExpr,
  VarExpr,
} from "@astroapps/evaluator";

export type RuleType = "single" | "multi" | "forEach";

/**
 * Base interface for all rule types.
 */
export interface BaseRule {
  type: RuleType;
}

/**
 * A single validation rule for a specific path.
 */
export interface SingleRule extends BaseRule {
  type: "single";
  /** Expression pointing to the data field to validate */
  path: EvalExpr;
  /** Properties/metadata about the rule (stored as expression) */
  props: EvalExpr;
  /** Boolean expression that must be true for validation to pass */
  must: EvalExpr;
}

/**
 * Combines multiple rules together.
 */
export interface MultiRule extends BaseRule {
  type: "multi";
  rules: Rule[];
}

/**
 * Iterates over arrays and validates each element.
 */
export interface ForEachRule extends BaseRule {
  type: "forEach";
  /** Expression resolving to array */
  path: EvalExpr;
  /** Variable name representing current array index */
  index: VarExpr;
  /** Optional let-binding for additional variables */
  variables?: LetExpr;
  /** The rule to apply to each element */
  rule: Rule;
}

export type Rule = SingleRule | MultiRule | ForEachRule;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a single validation rule.
 */
export function singleRule(
  path: EvalExpr,
  must: EvalExpr,
  props: EvalExpr = NullExpr,
): SingleRule {
  return { type: "single", path, props, must };
}

/**
 * Create a rule that combines multiple rules.
 */
export function multiRule(...rules: Rule[]): MultiRule {
  return { type: "multi", rules };
}

/**
 * Create a rule that iterates over an array and validates each element.
 */
export function forEachRule(
  path: EvalExpr,
  index: VarExpr,
  rule: Rule,
  variables?: LetExpr,
): ForEachRule {
  return { type: "forEach", path, index, variables, rule };
}

// ============================================================================
// Builder Functions (fluent API for SingleRule)
// ============================================================================

/**
 * Add a property to a single rule.
 */
export function withProp(
  rule: SingleRule,
  key: EvalExpr,
  value: EvalExpr,
): SingleRule {
  return {
    ...rule,
    props: callExpr("WithProperty", [key, value, rule.props]),
  };
}

/**
 * Add an additional condition (AND) to a single rule.
 */
export function andMust(rule: SingleRule, andMustExpr: EvalExpr): SingleRule {
  return {
    ...rule,
    must: callExpr("and", [rule.must, andMustExpr]),
  };
}

/**
 * Make a rule conditional - only validates when the condition is true.
 */
export function when(rule: SingleRule, whenExpr: EvalExpr): SingleRule {
  return {
    ...rule,
    must: callExpr("?", [whenExpr, rule.must, NullExpr]),
  };
}

/**
 * Attach a custom error message to a rule.
 */
export function withMessage(rule: SingleRule, message: EvalExpr): SingleRule {
  return {
    ...rule,
    must: callExpr("WithMessage", [message, rule.must]),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all rules from a rule (flattens MultiRule).
 */
export function getRules(rule: Rule): Rule[] {
  if (rule.type === "multi") {
    return rule.rules;
  }
  return [rule];
}

/**
 * Concatenate two rules into a single MultiRule.
 */
export function concatRules(rule1: Rule, rule2: Rule): MultiRule {
  return multiRule(...getRules(rule1), ...getRules(rule2));
}

/**
 * Add a rule to a ForEachRule.
 */
export function addRule(forEachRule: ForEachRule, rule: Rule): ForEachRule {
  return {
    ...forEachRule,
    rule: concatRules(forEachRule.rule, rule),
  };
}

// ============================================================================
// Helper for creating rules with string paths
// ============================================================================

/**
 * Create a single rule using a property expression path.
 */
export function ruleForPath(
  path: string,
  must: EvalExpr,
  props: EvalExpr = NullExpr,
): SingleRule {
  return singleRule({ type: "property", property: path }, must, props);
}

/**
 * Create a single rule using a variable expression path.
 */
export function ruleForVar(
  varName: string,
  must: EvalExpr,
  props: EvalExpr = NullExpr,
): SingleRule {
  return singleRule({ type: "var", variable: varName }, must, props);
}
