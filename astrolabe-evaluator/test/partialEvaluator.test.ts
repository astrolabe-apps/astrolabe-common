import { describe, expect, test } from "vitest";
import { PartialEvalEnvironment, partialEvaluate } from "../src/partialEvaluator";
import { parseEval } from "../src/parseEval";
import { toNormalString } from "../src/normalString";
import { valueExpr, EvalEnvState, EvalData, ValueExpr, emptyEnvState } from "../src/ast";
import { defaultFunctions } from "../src/defaultFunctions";

/**
 * Tests for partialEvaluate - verifies that expressions are partially evaluated
 * with compile-time values substituted while preserving runtime expressions.
 */

function createValueExpr(value: unknown): ValueExpr {
  if (value === null || value === undefined) {
    return valueExpr(value);
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj: Record<string, ValueExpr> = {};
    for (const [key, val] of Object.entries(value)) {
      obj[key] = createValueExpr(val);
    }
    return valueExpr(obj);
  }

  return valueExpr(value);
}

function createPartialEnv(
  compileTimeVars: Record<string, unknown> = {},
): PartialEvalEnvironment {
  // Create compile-time variables
  const vars: Record<string, ValueExpr> = {};
  for (const [key, value] of Object.entries(compileTimeVars)) {
    vars[key] = createValueExpr(value);
  }

  // Create environment with no data context (undefined)
  const state: EvalEnvState = {
    data: {
      root: valueExpr(undefined),
      getProperty: () => valueExpr(undefined),
    } as EvalData,
    current: valueExpr(undefined),
    localVars: { ...vars, ...defaultFunctions },
    parent: undefined,
    errors: [],
    compare: emptyEnvState().compare,
  };

  return new PartialEvalEnvironment(state);
}

describe("Partial Evaluator", () => {
  test("Literal values remain unchanged", () => {
    // Test case 1: Literal values remain unchanged
    const env = createPartialEnv();
    const expr = parseEval("42");

    const result = partialEvaluate(env, expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe(42);
  });

  test("Variable substitution with compile-time value", () => {
    // Test case 2: Variable substitution
    const env = createPartialEnv({
      vv: { x: 100 },
    });
    const expr = parseEval("$vv.x");

    const result = partialEvaluate(env, expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe(100);
  });

  test("Ternary with known condition (true)", () => {
    // Test case 3: Ternary with known condition (true)
    const env = createPartialEnv({
      vv: { flag: true },
    });
    const expr = parseEval("$vv.flag ? field1 : field2");

    const result = partialEvaluate(env, expr);

    // Should return PropertyExpr for field1
    expect(result.type).toBe("property");
    expect((result as any).property).toBe("field1");
  });

  test("Ternary with known condition (false) - main example", () => {
    // Test case 4: Ternary with known condition (false) - main example
    const env = createPartialEnv({
      vv: {
        length: 19,
        other: 40,
      },
    });
    const expr = parseEval("$vv.length > 20 ? field1 + field2 : field3 + $vv.other");

    const result = partialEvaluate(env, expr);

    // Should be: field3 + 40
    const normalized = toNormalString(result);
    // Expected: (+,'field3',40)
    expect(normalized).toBe("(+,'field3',40)");
  });

  test("Ternary with unknown condition", () => {
    // Test case 5: Ternary with unknown condition
    const env = createPartialEnv();
    const expr = parseEval("field1 > 20 ? field2 : field3");

    const result = partialEvaluate(env, expr);

    // Should remain as ternary
    expect(result.type).toBe("call");
    const call = result as any;
    expect(call.function).toBe("?");
    expect(call.args.length).toBe(3);
  });

  test("Binary operation with both operands known", () => {
    // Test case 6: Binary operation with both operands known
    const env = createPartialEnv({
      vv: {
        a: 10,
        b: 20,
      },
    });
    const expr = parseEval("$vv.a + $vv.b");

    const result = partialEvaluate(env, expr);

    expect(result.type).toBe("value");
    expect((result as ValueExpr).value).toBe(30);
  });

  test("Binary operation with one operand known", () => {
    // Test case 7: Binary operation with one operand known
    const env = createPartialEnv({
      vv: { offset: 5 },
    });
    const expr = parseEval("field1 + $vv.offset");

    const result = partialEvaluate(env, expr);

    // Should be: field1 + 5
    expect(result.type).toBe("call");
    const call = result as any;
    expect(call.function).toBe("+");
    expect(call.args[0].type).toBe("property");
    expect(call.args[1].type).toBe("value");
    expect(call.args[1].value).toBe(5);
  });

  test("Binary operation with no operands known", () => {
    // Test case 8: Binary operation with no operands known
    const env = createPartialEnv();
    const expr = parseEval("field1 + field2");

    const result = partialEvaluate(env, expr);

    // Should remain as binary op
    expect(result.type).toBe("call");
    const call = result as any;
    expect(call.function).toBe("+");
    expect(call.args[0].type).toBe("property");
    expect(call.args[1].type).toBe("property");
  });

  test("Nested expressions partially evaluated", () => {
    // Test case 9: Nested expressions
    const env = createPartialEnv({
      vv: {
        x: 15,
        y: 3,
        z: 2,
      },
    });
    const expr = parseEval("$vv.x > 10 ? field1 + $vv.y : field2 * $vv.z");

    const result = partialEvaluate(env, expr);

    // Condition $vv.x > 10 = 15 > 10 = true
    // Should pick true branch: field1 + $vv.y = field1 + 3
    const normalized = toNormalString(result);
    // Expected: (+,'field1',3)
    expect(normalized).toBe("(+,'field1',3)");
  });

  test("Array with mixed known/unknown elements", () => {
    // Test case 10: Array with mixed known/unknown elements
    const env = createPartialEnv({
      vv: {
        a: 1,
        b: 2,
      },
    });
    const expr = parseEval("[$vv.a, field1, $vv.b]");

    const result = partialEvaluate(env, expr);

    // Should be: [1, field1, 2]
    expect(result.type).toBe("array");
    const arr = result as any;
    expect(arr.values.length).toBe(3);
    expect(arr.values[0].type).toBe("value");
    expect(arr.values[1].type).toBe("property");
    expect(arr.values[2].type).toBe("value");
  });

  test("Let expression with partial bindings", () => {
    // Test case 11: Let expression with partial bindings
    const env = createPartialEnv({
      vv: { value: 10 },
    });
    const expr = parseEval("let $x := $vv.value, $y := field1 in $x + $y");

    const result = partialEvaluate(env, expr);

    // $x is fully evaluated to 10, but $y depends on field1
    // Result should be: let $y := field1 in 10 + $y
    const normalized = toNormalString(result);
    // Format: =,{var},{binding}=body
    expect(normalized).toBe("=,y,'field1'=(+,10,$y$)");
  });

  test("Lambda with compile-time values in body", () => {
    // Test case 12: Lambda with compile-time values in body
    const env = createPartialEnv({
      vv: { offset: 5 },
    });
    // Just test the lambda itself, not wrapped in a map call
    const expr = parseEval("$x => $x + $vv.offset");

    const result = partialEvaluate(env, expr);

    // Should be a lambda with partially evaluated body
    expect(result.type).toBe("lambda");
    const lambda = result as any;

    // Lambda body should be $x + 5
    const normalized = toNormalString(lambda.expr);
    // Expected: (+,$x$,5)
    expect(normalized).toBe("(+,$x$,5)");
  });
});
