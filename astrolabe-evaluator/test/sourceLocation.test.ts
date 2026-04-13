import { describe, expect, test } from "vitest";
import { parseEval } from "../src/parseEval";
import type {
  ArrayExpr,
  CallExpr,
  LambdaExpr,
  LetExpr,
  PropertyExpr,
  ValueExpr,
  VarExpr,
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
    const input = "let $x := 1 in $x + 2";
    const parsed = parseEval(input) as LetExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(21);
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
    const input = "let $x := 1 in $x + 2";
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
    const input = `let $x := 1
in $x + 2`;
    const parsed = parseEval(input) as LetExpr;
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(21);
  });
});

describe("Let Expression Variable Locations", () => {
  test("Single variable declaration has location", () => {
    const input = "let $x := 1 in $x + 2";
    const parsed = parseEval(input) as LetExpr;

    // Verify the LetExpr has a location
    expect(parsed.location).toBeDefined();
    expect(parsed.location?.start).toBe(0);
    expect(parsed.location?.end).toBe(21);

    // Verify the variable name VarExpr has a location
    const varExpr = parsed.variables[0][0];
    expect(varExpr.type).toBe("var");
    expect(varExpr.variable).toBe("x");
    expect(varExpr.location).toBeDefined();
    expect(varExpr.location?.start).toBe(4); // Position of "$x"
    expect(varExpr.location?.end).toBe(6);
  });

  test("Multiple variable declarations have distinct locations", () => {
    const input = "let $x := 1, $y := 2 in $x + $y";
    const parsed = parseEval(input) as LetExpr;

    // Verify we have two variables
    expect(parsed.variables.length).toBe(2);

    // First variable: $x
    const firstVar = parsed.variables[0][0];
    expect(firstVar.variable).toBe("x");
    expect(firstVar.location).toBeDefined();
    expect(firstVar.location?.start).toBe(4); // Position of "$x"
    expect(firstVar.location?.end).toBe(6);

    // Second variable: $y
    const secondVar = parsed.variables[1][0];
    expect(secondVar.variable).toBe("y");
    expect(secondVar.location).toBeDefined();
    expect(secondVar.location?.start).toBe(13); // Position of "$y"
    expect(secondVar.location?.end).toBe(15);
  });

  test("Variable declaration and reference have different locations", () => {
    const input = "let $x := 1 in $x + 2";
    const parsed = parseEval(input) as LetExpr;

    // Variable declaration location
    const declaredVar = parsed.variables[0][0];
    expect(declaredVar.location?.start).toBe(4); // "let $x"
    expect(declaredVar.location?.end).toBe(6);

    // Variable reference in the body
    const bodyExpr = parsed.expr as CallExpr;
    const varReference = bodyExpr.args[0] as VarExpr;
    expect(varReference.type).toBe("var");
    expect(varReference.variable).toBe("x");
    expect(varReference.location).toBeDefined();
    expect(varReference.location?.start).toBe(15); // "in $x"
    expect(varReference.location?.end).toBe(17);

    // Locations should be different
    expect(declaredVar.location?.start).not.toBe(varReference.location?.start);
  });

  test("Variable in nested let expressions have correct locations", () => {
    const input = "let $x := 1 in let $y := 2 in $y";
    const parsed = parseEval(input) as LetExpr;

    // Outer variable: $x
    const outerVar = parsed.variables[0][0];
    expect(outerVar.variable).toBe("x");
    expect(outerVar.location?.start).toBe(4);
    expect(outerVar.location?.end).toBe(6);

    // Inner let expression
    const innerLet = parsed.expr as LetExpr;
    const innerVar = innerLet.variables[0][0];
    expect(innerVar.variable).toBe("y");
    expect(innerVar.location).toBeDefined();
    expect(innerVar.location?.start).toBe(19); // Position of "$y" in inner let
    expect(innerVar.location?.end).toBe(21);
  });

  test("Variable with source file preserves sourceFile in VarExpr", () => {
    const input = "let $x := 1 in $x";
    const parsed = parseEval(input, "test.expr") as LetExpr;

    // Variable declaration should have source file
    const varExpr = parsed.variables[0][0];
    expect(varExpr.location?.sourceFile).toBe("test.expr");

    // Variable reference should also have source file
    const varRef = parsed.expr as VarExpr;
    expect(varRef.location?.sourceFile).toBe("test.expr");
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
