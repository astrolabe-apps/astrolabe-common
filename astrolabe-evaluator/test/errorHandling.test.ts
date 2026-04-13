import { describe, expect, test } from "vitest";
import {
  collectAllErrors,
  EvalEnv,
  hasErrors,
  ValueExpr,
  valueExpr,
  valueExprWithError,
} from "../src/ast";
import { createBasicEnv, evaluate } from "../src/evaluate";
import { parseEval } from "../src/parseEval";
import { basicEnv, partialEnv } from "../src/defaultFunctions";

/**
 * Tests for Phase 1 error handling utilities:
 * - valueExprWithError()
 * - collectAllErrors()
 * - hasErrors()
 * - EvalEnv.withDeps()
 */

describe("valueExprWithError", () => {
  test("creates ValueExpr with error message", () => {
    const result = valueExprWithError(null, "Test error");
    expect(result.type).toBe("value");
    expect(result.value).toBeNull();
    expect(result.error).toBe("Test error");
  });

  test("creates ValueExpr with value and error", () => {
    const result = valueExprWithError(42, "Warning: value may be incorrect");
    expect(result.value).toBe(42);
    expect(result.error).toBe("Warning: value may be incorrect");
  });

  test("preserves location information", () => {
    const location = { start: 10, end: 20 };
    const result = valueExprWithError(null, "Error", { location });
    expect(result.location).toEqual(location);
  });
});

describe("collectAllErrors", () => {
  test("returns empty array for ValueExpr without errors", () => {
    const expr = valueExpr(42);
    const errors = collectAllErrors(expr);
    expect(errors).toEqual([]);
  });

  test("returns errors from single ValueExpr", () => {
    const expr = valueExprWithError(null, "Test error");
    const errors = collectAllErrors(expr);
    expect(errors).toEqual(["Test error"]);
  });

  test("collects errors from dependencies", () => {
    const dep1 = valueExprWithError(null, "Error 1");
    const dep2 = valueExprWithError(null, "Error 2");
    const parent: ValueExpr = {
      type: "value",
      value: null,
      deps: [dep1, dep2],
    };

    const errors = collectAllErrors(parent);
    expect(errors).toContain("Error 1");
    expect(errors).toContain("Error 2");
    expect(errors.length).toBe(2);
  });

  test("collects errors from nested dependencies", () => {
    const deepDep = valueExprWithError(null, "Deep error");
    const midDep: ValueExpr = {
      type: "value",
      value: null,
      deps: [deepDep],
    };
    const parent: ValueExpr = {
      type: "value",
      value: null,
      deps: [midDep],
    };

    const errors = collectAllErrors(parent);
    expect(errors).toEqual(["Deep error"]);
  });

  test("collects errors from parent and nested deps", () => {
    const deepDep = valueExprWithError(null, "Deep error");
    const midDep: ValueExpr = {
      type: "value",
      value: null,
      error: "Mid error",
      deps: [deepDep],
    };
    const parent: ValueExpr = {
      type: "value",
      value: null,
      error: "Parent error",
      deps: [midDep],
    };

    const errors = collectAllErrors(parent);
    expect(errors).toContain("Parent error");
    expect(errors).toContain("Mid error");
    expect(errors).toContain("Deep error");
    expect(errors.length).toBe(3);
  });

  test("handles circular references", () => {
    const expr1: ValueExpr = {
      type: "value",
      value: null,
      error: "Error 1",
    };
    const expr2: ValueExpr = {
      type: "value",
      value: null,
      error: "Error 2",
      deps: [expr1],
    };
    // Create circular reference
    expr1.deps = [expr2];

    const errors = collectAllErrors(expr1);
    expect(errors).toContain("Error 1");
    expect(errors).toContain("Error 2");
    expect(errors.length).toBe(2);
  });

  test("returns empty array for non-value expressions", () => {
    const varExpr = { type: "var" as const, variable: "x" };
    const errors = collectAllErrors(varExpr);
    expect(errors).toEqual([]);
  });
});

describe("hasErrors", () => {
  test("returns false for ValueExpr without errors", () => {
    const expr = valueExpr(42);
    expect(hasErrors(expr)).toBe(false);
  });

  test("returns true for ValueExpr with errors", () => {
    const expr = valueExprWithError(null, "Error");
    expect(hasErrors(expr)).toBe(true);
  });

  test("returns true when dependency has errors", () => {
    const dep = valueExprWithError(null, "Dep error");
    const parent: ValueExpr = {
      type: "value",
      value: 42,
      deps: [dep],
    };

    expect(hasErrors(parent)).toBe(true);
  });

  test("returns false when no errors in tree", () => {
    const dep = valueExpr(1);
    const parent: ValueExpr = {
      type: "value",
      value: 42,
      deps: [dep],
    };

    expect(hasErrors(parent)).toBe(false);
  });

  test("handles nested errors", () => {
    const deepDep = valueExprWithError(null, "Deep error");
    const midDep: ValueExpr = {
      type: "value",
      value: null,
      deps: [deepDep],
    };
    const parent: ValueExpr = {
      type: "value",
      value: null,
      deps: [midDep],
    };

    expect(hasErrors(parent)).toBe(true);
  });

  test("handles circular references", () => {
    const expr1: ValueExpr = {
      type: "value",
      value: null,
      error: "Error",
    };
    const expr2: ValueExpr = {
      type: "value",
      value: null,
      deps: [expr1],
    };
    expr1.deps = [expr2];

    expect(hasErrors(expr1)).toBe(true);
    expect(hasErrors(expr2)).toBe(true);
  });

  test("returns false for non-value expressions", () => {
    const varExpr = { type: "var" as const, variable: "x" };
    expect(hasErrors(varExpr)).toBe(false);
  });
});

describe("EvalEnv.withDeps", () => {
  function createTestEnv(): EvalEnv {
    return createBasicEnv();
  }

  test("returns original result when no deps", () => {
    const env = createTestEnv();
    const result = valueExpr(42);

    const withDeps = env.withDeps(result, []);
    expect(withDeps).toBe(result);
  });

  test("attaches ValueExpr dependencies", () => {
    const env = createTestEnv();
    const result = valueExpr(42);
    const dep1 = valueExpr(1);
    const dep2 = valueExpr(2);

    const withDeps = env.withDeps(result, [dep1, dep2]);
    expect(withDeps.deps).toContain(dep1);
    expect(withDeps.deps).toContain(dep2);
    expect(withDeps.value).toBe(42);
  });

  test("filters out non-ValueExpr dependencies", () => {
    const env = createTestEnv();
    const result = valueExpr(42);
    const valueDep = valueExpr(1);
    const varDep = { type: "var" as const, variable: "x" };

    const withDeps = env.withDeps(result, [valueDep, varDep]);
    expect(withDeps.deps).toEqual([valueDep]);
  });

  test("merges with existing dependencies", () => {
    const env = createTestEnv();
    const existingDep = valueExpr(0);
    const result: ValueExpr = {
      type: "value",
      value: 42,
      deps: [existingDep],
    };
    const newDep = valueExpr(1);

    const withDeps = env.withDeps(result, [newDep]);
    expect(withDeps.deps).toContain(existingDep);
    expect(withDeps.deps).toContain(newDep);
    expect(withDeps.deps?.length).toBe(2);
  });

  test("preserves other properties", () => {
    const env = createTestEnv();
    const result: ValueExpr = {
      type: "value",
      value: 42,
      error: "Warning",
      data: { custom: true },
      location: { start: 0, end: 10 },
    };
    const dep = valueExpr(1);

    const withDeps = env.withDeps(result, [dep]);
    expect(withDeps.value).toBe(42);
    expect(withDeps.error).toBe("Warning");
    expect(withDeps.data).toEqual({ custom: true });
    expect(withDeps.location).toEqual({ start: 0, end: 10 });
  });

  test("returns original when only non-ValueExpr deps", () => {
    const env = createTestEnv();
    const result = valueExpr(42);
    const varDep = { type: "var" as const, variable: "x" };
    const callDep = { type: "call" as const, function: "f", args: [] };

    const withDeps = env.withDeps(result, [varDep, callDep]);
    expect(withDeps.deps).toBeUndefined();
  });
});

describe("ValueExpr.error and data fields", () => {
  test("ValueExpr can have error field", () => {
    const expr: ValueExpr = {
      type: "value",
      value: null,
      error: "Error message",
    };
    expect(expr.error).toBe("Error message");
  });

  test("ValueExpr can have data field", () => {
    const expr: ValueExpr = {
      type: "value",
      value: 42,
      data: { validationState: "invalid", customInfo: [1, 2, 3] },
    };
    expect(expr.data).toEqual({
      validationState: "invalid",
      customInfo: [1, 2, 3],
    });
  });

  test("error and data are optional", () => {
    const expr = valueExpr(42);
    expect(expr.error).toBeUndefined();
    expect(expr.data).toBeUndefined();
  });
});

// ============================================================================
// Phase 2: evaluateExpr tests
// ============================================================================

describe("evaluateExpr - BasicEvalEnv", () => {
  test("evaluates simple value expression", () => {
    const env = basicEnv({});
    const expr = parseEval("42");
    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe(42);
  });

  test("evaluates arithmetic expression", () => {
    const env = basicEnv({});
    const expr = parseEval("1 + 2");
    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe(3);
  });

  test("evaluates property access", () => {
    const env = basicEnv({ name: "test", count: 5 });
    const expr = parseEval("name");
    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe("test");
  });

  test("evaluates let expression", () => {
    const env = basicEnv({});
    const expr = parseEval("let $x = 10 in $x + 5");
    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe(15);
  });

  test("evaluates array expression", () => {
    const env = basicEnv({});
    const expr = parseEval("[1, 2, 3]");
    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    const arrValue = (result as ValueExpr).value as ValueExpr[];
    expect(arrValue.length).toBe(3);
    expect(arrValue[0].value).toBe(1);
    expect(arrValue[1].value).toBe(2);
    expect(arrValue[2].value).toBe(3);
  });

  test("returns error in ValueExpr for undefined variable", () => {
    const env = basicEnv({});
    const expr = parseEval("$undeclared");
    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).error).toBeDefined();
    expect((result as ValueExpr).error).toContain("not declared");
  });

  test("returns error in ValueExpr for undefined function", () => {
    const env = basicEnv({});
    const expr = parseEval("unknownFunc(1, 2)");
    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).error).toBeDefined();
    expect((result as ValueExpr).error).toContain("not declared");
  });

  test("evaluate2 helper returns ValueExpr", () => {
    const env = basicEnv({ x: 10 });
    const expr = parseEval("x + 5");
    const result = evaluate(env, expr);

    expect(result.type).toBe("value");
    expect(result.value).toBe(15);
  });

  test("collectAllErrors works with evaluateExpr results", () => {
    const env = basicEnv({});
    // Use a simple undefined variable case (not in a function call)
    const expr = parseEval("$undefined");
    const result = env.evaluateExpr(expr);

    // Should have error about undefined variable
    const errors = collectAllErrors(result);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("not declared");
  });
});

describe("evaluateExpr - PartialEvalEnv", () => {
  test("evaluates simple value expression", () => {
    const env = partialEnv({});
    const expr = parseEval("42");
    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe(42);
  });

  test("returns VarExpr for undefined variable (partial eval)", () => {
    const env = partialEnv({});
    const expr = parseEval("$undeclared");
    const result = env.evaluateExpr(expr);

    // Partial eval returns the VarExpr unchanged, not an error
    expect(result.type).toBe("var");
  });

  test("returns CallExpr for undefined function (partial eval)", () => {
    const env = partialEnv({});
    const expr = parseEval("unknownFunc(1, 2)");
    const result = env.evaluateExpr(expr);

    // Partial eval returns the CallExpr unchanged, not an error
    expect(result.type).toBe("call");
  });

  test("evaluates known expressions fully", () => {
    const env = partialEnv({ x: 10 });
    const expr = parseEval("x + 5");
    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe(15);
  });

  test("returns mixed result for partial evaluation", () => {
    const env = partialEnv({ x: 10 });
    const expr = parseEval("[x, $unknown]");
    const result = env.evaluateExpr(expr);

    // Should return ArrayExpr since not all elements are evaluated
    expect(result.type).toBe("array");
  });
});

describe("evaluateExpr evaluation", () => {
  test("evaluates simple expressions", () => {
    const env = basicEnv({ a: 5, b: 3 });
    const expr = parseEval("a + b");

    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe(8);
  });

  test("evaluates complex expressions with map", () => {
    const env = basicEnv({ nums: [1, 2, 3, 4, 5] });
    const expr = parseEval("$map(nums, $x => $x * 2)");

    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    const arr = (result as ValueExpr).value as ValueExpr[];
    expect(arr.length).toBe(5);
    // Each element is a ValueExpr with a value property
    expect((arr[0] as ValueExpr).value).toBe(2);
    expect((arr[4] as ValueExpr).value).toBe(10);
  });

  test("errors are stored in ValueExpr", () => {
    const env = basicEnv({});
    const expr = parseEval("$undefined");

    // Errors are in ValueExpr, not environment
    const result = env.evaluateExpr(expr);
    expect((result as ValueExpr).error).toBeDefined();
    expect((result as ValueExpr).error).toContain("undefined");
  });
});
