import {
  compareSignificantDigits,
  EvalEnv,
  EvalExpr,
  getExprData,
  getPropertyFromValue,
  hasExprData,
  ValueExpr,
  VarExpr,
  withExprData,
  withoutExprData,
} from "./ast";

/**
 * Data structure stored in the `data` field of expressions during inlining.
 * Tracks which variable an expression was inlined from and its scope.
 */
export interface InlineData {
  inlinedFrom: string;
  scopeId: number;
}

/**
 * Type guard to check if an expression's data is InlineData.
 */
export function isInlineData(data: unknown): data is InlineData {
  return (
    typeof data === "object" &&
    data !== null &&
    "inlinedFrom" in data &&
    typeof (data as InlineData).inlinedFrom === "string" &&
    "scopeId" in data &&
    typeof (data as InlineData).scopeId === "number"
  );
}

/** Counter for generating unique scope IDs */
let nextScopeId = 0;

/** Key used to store InlineData in expression data dictionaries */
const INLINE_DATA_KEY = "inline";

/**
 * PartialEvalEnv performs partial evaluation with lazy variable evaluation and caching.
 * Returns symbolic expressions for unknown variables and functions.
 */
export class PartialEvalEnv extends EvalEnv {
  private localVars: Record<string, EvalExpr>;
  private evalCache = new Map<string, EvalExpr>();
  readonly scopeId: number;

  constructor(
    localVars: Record<string, EvalExpr>,
    private parent: PartialEvalEnv | undefined,
    public readonly compare: (v1: unknown, v2: unknown) => number,
  ) {
    super();
    this.localVars = localVars;
    this.scopeId = nextScopeId++;
  }

  /**
   * Evaluate a variable by name with caching.
   * For partial evaluation, unknown variables return VarExpr.
   * Results are tagged with the variable name for later uninlining.
   */
  private evaluateVariable(name: string): EvalExpr {
    // If var is in THIS scope, check/update THIS cache
    if (name in this.localVars) {
      const cached = this.evalCache.get(name);
      if (cached) return cached;

      const binding = this.localVars[name];
      // Detect self-referential bindings to prevent infinite recursion
      if (binding.type === "var" && binding.variable === name) {
        return binding;
      }
      const result = this.evaluateExpr(binding);

      // Tag the result with the variable name and scope ID (for uninlining)
      const tagged = !hasExprData(result, INLINE_DATA_KEY)
        ? withExprData(result, INLINE_DATA_KEY, {
            inlinedFrom: name,
            scopeId: this.scopeId,
          } as InlineData)
        : result;

      this.evalCache.set(name, tagged);
      return tagged;
    }
    // Delegate to parent - parent caches its own vars
    if (this.parent) {
      return this.parent.evaluateVariable(name);
    }
    // For partial evaluation, return the VarExpr itself (not error)
    return { type: "var", variable: name };
  }

  newScope(vars: Record<string, EvalExpr>): PartialEvalEnv {
    if (Object.keys(vars).length === 0) return this;
    return new PartialEvalEnv(vars, this, this.compare);
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
        return this.evaluateVariable(expr.variable);

      case "let": {
        const bindings: Record<string, EvalExpr> = {};
        for (const [v, e] of expr.variables) {
          bindings[v.variable] = e;
        }
        const scopeEnv = this.newScope(bindings);
        return scopeEnv.evaluateExpr(expr.expr);
      }

      case "value":
        return expr;

      case "call": {
        const funcExpr = this.evaluateVariable(expr.function);
        if (funcExpr.type !== "value" || !funcExpr.function) {
          // For partial evaluation, return the CallExpr itself (not error)
          return expr;
        }
        return funcExpr.function.eval(this, expr);
      }

      case "property": {
        const currentValue = this.getCurrentValue();
        if (!currentValue || currentValue.type !== "value") {
          return expr; // Return PropertyExpr unchanged (no current data or not fully evaluated)
        }
        return this.evaluateExpr(
          getPropertyFromValue(currentValue, expr.property),
        );
      }

      case "array": {
        const partialValues = expr.values.map((v) => this.evaluateExpr(v));
        // Check if all elements are fully evaluated
        const allFullyEvaluated = partialValues.every(
          (v) => v.type === "value",
        );
        if (allFullyEvaluated) {
          return {
            type: "value",
            value: partialValues as ValueExpr[],
          };
        }
        // At least one element is symbolic - return ArrayExpr
        return { type: "array", values: partialValues };
      }

      case "lambda":
        // Lambdas are kept as-is in partial evaluation
        return expr;

      default:
        throw new Error("Can't evaluate: " + (expr as any).type);
    }
  }

  /**
   * Analyzes an expression tree and recreates let bindings for expressions
   * that appear multiple times or exceed a complexity threshold.
   *
   * Uses composite keys (scopeId:varName) to correctly handle variable shadowing.
   * Each scope has a unique ID, so same-named variables in different scopes
   * are correctly distinguished.
   *
   * @param expr - The expression tree to uninline
   * @param options - Configuration options
   * @returns A new expression with appropriate let bindings
   */
  uninline(expr: EvalExpr, options?: UninlineOptions): EvalExpr {
    const { complexityThreshold = 1, minOccurrences = 2 } = options ?? {};

    // 1. Collect tagged expressions and count occurrences using composite keys
    const tagged = new Map<
      string,
      { expr: EvalExpr; count: number; complexity: number; varName: string }
    >();
    collectTaggedExprs(expr, tagged);

    // 2. Filter candidates and generate unique names for shadowed variables
    const toUninline = new Map<string, string>(); // compositeKey -> actualVarName
    const usedNames = new Set<string>();

    for (const [key, info] of tagged) {
      if (info.count >= minOccurrences && info.complexity >= complexityThreshold) {
        // Generate unique name if needed (for shadowed vars)
        let varName = info.varName;
        if (usedNames.has(varName)) {
          let i = 1;
          while (usedNames.has(`${varName}_${i}`)) i++;
          varName = `${varName}_${i}`;
        }
        usedNames.add(varName);
        toUninline.set(key, varName);
      }
    }

    if (toUninline.size === 0) return expr;

    // 3. Replace tagged expressions with variable references
    const replaced = replaceTaggedWithVars(expr, toUninline);

    // 4. Build let expression with bindings
    const bindings: [VarExpr, EvalExpr][] = [];
    for (const [key, info] of tagged) {
      const varName = toUninline.get(key);
      if (varName) {
        bindings.push([
          { type: "var", variable: varName },
          removeTag(info.expr),
        ]);
      }
    }

    return { type: "let", variables: bindings, expr: replaced };
  }
}

/**
 * Options for the uninline function.
 */
export interface UninlineOptions {
  /**
   * Minimum complexity score for uninlining candidates.
   * Default: 1 (any call expression or property access)
   */
  complexityThreshold?: number;

  /**
   * Minimum occurrences before uninlining.
   * Default: 2 (uninline if used more than once)
   */
  minOccurrences?: number;
}

/**
 * Calculate the complexity of an expression.
 */
function calculateComplexity(expr: EvalExpr): number {
  switch (expr.type) {
    case "value":
    case "var":
      return 0;
    case "property":
      return 1;
    case "call":
      return 1 + expr.args.reduce((s, a) => s + calculateComplexity(a), 0);
    case "array":
      return 1 + expr.values.reduce((s, v) => s + calculateComplexity(v), 0);
    case "lambda":
      return 1 + calculateComplexity(expr.expr);
    case "let":
      return (
        expr.variables.reduce((s, [_, e]) => s + calculateComplexity(e), 0) +
        calculateComplexity(expr.expr)
      );
  }
}

/**
 * Recursively collect all tagged expressions and count occurrences.
 * Uses composite key (scopeId:varName) to distinguish shadowed variables.
 */
function collectTaggedExprs(
  expr: EvalExpr,
  collected: Map<string, { expr: EvalExpr; count: number; complexity: number; varName: string }>,
): void {
  const inlineData = getExprData<InlineData>(expr, INLINE_DATA_KEY);
  if (inlineData && isInlineData(inlineData)) {
    const key = `${inlineData.scopeId}:${inlineData.inlinedFrom}`;
    const existing = collected.get(key);
    if (existing) {
      existing.count++;
    } else {
      collected.set(key, {
        expr,
        count: 1,
        complexity: calculateComplexity(expr),
        varName: inlineData.inlinedFrom,
      });
    }
  }
  // Recursively visit children
  switch (expr.type) {
    case "call":
      expr.args.forEach((a) => collectTaggedExprs(a, collected));
      break;
    case "array":
      expr.values.forEach((v) => collectTaggedExprs(v, collected));
      break;
    case "let":
      expr.variables.forEach(([_, e]) => collectTaggedExprs(e, collected));
      collectTaggedExprs(expr.expr, collected);
      break;
    case "lambda":
      collectTaggedExprs(expr.expr, collected);
      break;
  }
}

/**
 * Replace tagged expressions with variable references.
 * Uses composite key (scopeId:varName) to correctly replace shadowed variables.
 */
function replaceTaggedWithVars(
  expr: EvalExpr,
  toReplace: Map<string, string>, // compositeKey -> actualVarName
): EvalExpr {
  const inlineData = getExprData<InlineData>(expr, INLINE_DATA_KEY);
  if (inlineData && isInlineData(inlineData)) {
    const key = `${inlineData.scopeId}:${inlineData.inlinedFrom}`;
    const varName = toReplace.get(key);
    if (varName) {
      return { type: "var", variable: varName };
    }
  }
  switch (expr.type) {
    case "call":
      return {
        ...expr,
        args: expr.args.map((a) => replaceTaggedWithVars(a, toReplace)),
      };
    case "array":
      return {
        ...expr,
        values: expr.values.map((v) => replaceTaggedWithVars(v, toReplace)),
      };
    case "let":
      return {
        ...expr,
        variables: expr.variables.map(
          ([v, e]) =>
            [v, replaceTaggedWithVars(e, toReplace)] as [VarExpr, EvalExpr],
        ),
        expr: replaceTaggedWithVars(expr.expr, toReplace),
      };
    case "lambda":
      return {
        ...expr,
        expr: replaceTaggedWithVars(expr.expr, toReplace),
      };
    default:
      return expr;
  }
}

/**
 * Remove inline data tag from an expression (shallow copy).
 */
function removeTag(expr: EvalExpr): EvalExpr {
  return withoutExprData(expr, INLINE_DATA_KEY);
}

/**
 * Create a PartialEvalEnv with standard functions.
 * Current data is bound to the `_` variable.
 */
export function createPartialEnv(
  functions: Record<string, EvalExpr> = {},
  current?: ValueExpr,
): PartialEvalEnv {
  // Bind current data to `_` variable along with functions
  const vars = current !== undefined ? { ...functions, _: current } : functions;
  return new PartialEvalEnv(vars, undefined, compareSignificantDigits(5));
}
