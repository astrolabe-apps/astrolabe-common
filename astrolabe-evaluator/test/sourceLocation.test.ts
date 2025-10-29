import { describe, expect, test } from "vitest";
import { parseEval } from "../src/parseEval";
import type {
  CallExpr,
  VarExpr,
  ValueExpr,
  PropertyExpr,
  ArrayExpr,
  LetExpr,
  LambdaExpr,
  SourceLocation,
} from "../src/ast";

/**
 * Tests for source location tracking in the AST.
 * Verifies that all AST nodes have correct start/end positions and sourceFile.
 */

describe("Basic Literals", () => {
  test("Number literal has correct location", () => {
    const input = "42";
    const parsed = parseEval(input) as ValueExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(2);
  });

  test("String literal has correct location", () => {
    const input = '"hello"';
    const parsed = parseEval(input) as ValueExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(7);
  });

  test("Boolean true has correct location", () => {
    const input = "true";
    const parsed = parseEval(input) as ValueExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(4);
  });

  test("Boolean false has correct location", () => {
    const input = "false";
    const parsed = parseEval(input) as ValueExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(5);
  });

  test("Null literal has correct location", () => {
    const input = "null";
    const parsed = parseEval(input) as ValueExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(4);
  });

  test("Property identifier has correct location", () => {
    const input = "foo";
    const parsed = parseEval(input) as PropertyExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(3);
  });
});

describe("Variable References", () => {
  test("Variable reference has correct location", () => {
    const input = "$x";
    const parsed = parseEval(input) as VarExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(2);
  });

  test("Long variable name has correct location", () => {
    const input = "$myVariable";
    const parsed = parseEval(input) as VarExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(11);
  });
});

describe("Binary Operations", () => {
  test("Addition has correct location", () => {
    const input = "1 + 2";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(5);
  });

  test("Multiplication has correct location", () => {
    const input = "a * b";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(5);
  });

  test("Comparison has correct location", () => {
    const input = "x > y";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(5);
  });

  test("Logical and has correct location", () => {
    const input = "a and b";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(7);
  });

  test("Complex expression has correct location", () => {
    const input = "x - y / z";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(9);
  });
});

describe("Unary Operations", () => {
  test("Logical not has correct location", () => {
    const input = "!a";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(2);
  });

  test("Unary minus has correct location", () => {
    const input = "-5";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(2);
  });
});

describe("Complex Expressions", () => {
  test("Array literal has correct location", () => {
    const input = "[1, 2, 3]";
    const parsed = parseEval(input) as ArrayExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(9);
  });

  test("Object literal has correct location", () => {
    const input = "{a: 1, b: 2}";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(12);
  });

  test("Function call has correct location", () => {
    const input = "$sum(1, 2, 3)";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(13);
  });

  test("Template string has correct location", () => {
    const input = "`hello ${name}`";
    const parsed = parseEval(input) as CallExpr | ValueExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(15);
  });

  test("Ternary operator has correct location", () => {
    const input = "a ? b : c";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(9);
  });
});

describe("Nested Expressions", () => {
  test("Parenthesized expression preserves inner location", () => {
    const input = "(a + b)";
    const parsed = parseEval(input) as CallExpr;
    // The parentheses are stripped, so we get the inner expression
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(1);
    expect(parsed.location?.end).toBe(6);
  });

  test("Let expression has correct location", () => {
    const input = "let $x = 1 in $x + 2";
    const parsed = parseEval(input) as LetExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(20);
  });

  test("Lambda expression has correct location", () => {
    const input = "$x => $x + 1";
    const parsed = parseEval(input) as LambdaExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(12);
  });

  test("Nested binary operations have locations", () => {
    const input = "(a + b) * c";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(11);

    // Check the nested addition
    const leftArg = parsed.args[0] as CallExpr;
    expect(leftArg.location).toBeDefined();
    expect(leftArg.location?.start).toBe(1);
    expect(leftArg.location?.end).toBe(6);
  });
});

describe("Source File", () => {
  test("SourceFile is undefined when not provided", () => {
    const input = "42";
    const parsed = parseEval(input) as ValueExpr;
    expect(parsed.location?.sourceFile).toBeUndefined();
  });

  test("SourceFile is set when provided", () => {
    const input = "42";
    const parsed = parseEval(input, "test.expr") as ValueExpr;
    expect(parsed.location?.sourceFile).toBe("test.expr");
  });

  test("SourceFile propagates to nested expressions", () => {
    const input = "a + b";
    const parsed = parseEval(input, "myfile.expr") as CallExpr;
    expect(parsed.location?.sourceFile).toBe("myfile.expr");

    // Check nested property expressions
    const leftArg = parsed.args[0] as PropertyExpr;
    expect(leftArg.location?.sourceFile).toBe("myfile.expr");

    const rightArg = parsed.args[1] as PropertyExpr;
    expect(rightArg.location?.sourceFile).toBe("myfile.expr");
  });

  test("SourceFile propagates to deeply nested expressions", () => {
    const input = "let $x = 1 in $x + 2";
    const parsed = parseEval(input, "nested.expr") as LetExpr;
    expect(parsed.location?.sourceFile).toBe("nested.expr");

    // Check the inner expression
    const innerExpr = parsed.expr as CallExpr;
    expect(innerExpr.location?.sourceFile).toBe("nested.expr");
  });
});

describe("Multi-line Expressions", () => {
  test("Multi-line expression has correct span", () => {
    const input = "a +\nb";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(5);
  });

  test("Multi-line with complex nesting", () => {
    const input = `let $x = 1
in $x + 2`;
    const parsed = parseEval(input) as LetExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(20);
  });
});

describe("Edge Cases", () => {
  test("Empty array has correct location", () => {
    const input = "[]";
    const parsed = parseEval(input) as ArrayExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(2);
  });

  test("Empty object has correct location", () => {
    const input = "{}";
    const parsed = parseEval(input) as CallExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(2);
  });

  test("Whitespace is included in location", () => {
    const input = "  42  ";
    const parsed = parseEval(input) as ValueExpr;
    expect(parsed.location).toBeDefined();
    // Location should be for the number itself, not including leading/trailing whitespace
    expect(parsed.location?.start).toBe(2);
    expect(parsed.location?.end).toBe(4);
  });
});
