import { describe, expect, test } from "vitest";
import { ValueExpr } from "../src/ast";
import { basicEnv } from "../src/defaultFunctions";
import { parseEval } from "../src/parseEval";

/**
 * Tests to ensure comment syntax doesn't conflict with existing language features
 */

function evalExpr(expr: string, data: unknown = {}): unknown {
  const env = basicEnv(data);
  const parsed = parseEval(expr);
  const result = env.evaluateExpr(parsed) as ValueExpr;
  return result.value;
}

describe("Division Operator", () => {
  test("Division operator still works", () => {
    const result = evalExpr("a / b", { a: 10, b: 2 });
    expect(result).toBe(5);
  });

  test("Multiple divisions still work", () => {
    const result = evalExpr("a / b / c", { a: 100, b: 5, c: 2 });
    expect(result).toBe(10);
  });

  test("Division with spaces still works", () => {
    const result = evalExpr("a   /   b", { a: 20, b: 4 });
    expect(result).toBe(5);
  });
});

describe("Strings Containing Comment-Like Syntax", () => {
  test("Double quoted string with line comment syntax", () => {
    const result = evalExpr("text", { text: "This is // not a comment" });
    expect(result).toBe("This is // not a comment");
  });

  test("Double quoted string with block comment syntax", () => {
    const result = evalExpr("text", { text: "This is /* not a comment */" });
    expect(result).toBe("This is /* not a comment */");
  });

  test("Single quoted string with line comment syntax", () => {
    const result = evalExpr("'This is // not a comment'");
    expect(result).toBe("This is // not a comment");
  });

  test("Single quoted string with block comment syntax", () => {
    const result = evalExpr("'This is /* not a comment */'");
    expect(result).toBe("This is /* not a comment */");
  });
});

describe("Template Strings", () => {
  test("Template string with comment syntax literal", () => {
    const result = evalExpr("`This is // not a comment`");
    expect(result).toBe("This is // not a comment");
  });

  test("Template string with block comment syntax literal", () => {
    const result = evalExpr("`This is /* not a comment */`");
    expect(result).toBe("This is /* not a comment */");
  });
});

describe("Comments Around Division", () => {
  test("Line comment does not break division", () => {
    const result = evalExpr("a / b // this is division", { a: 10, b: 2 });
    expect(result).toBe(5);
  });

  test("Block comment before division", () => {
    const result = evalExpr("a /* comment */ / b", { a: 10, b: 2 });
    expect(result).toBe(5);
  });

  test("Block comment after division", () => {
    const result = evalExpr("a / /* comment */ b", { a: 10, b: 2 });
    expect(result).toBe(5);
  });
});

describe("Multiplication with Asterisk", () => {
  test("Multiplication operator not confused with block comment", () => {
    const result = evalExpr("a * b", { a: 5, b: 3 });
    expect(result).toBe(15);
  });

  test("Division followed by multiplication not confused with comment", () => {
    const result = evalExpr("a / b * c", { a: 10, b: 2, c: 3 });
    expect(result).toBe(15);
  });
});

describe("Edge Cases with Slashes and Asterisks", () => {
  test("Multiple slashes in expression with comments", () => {
    const result = evalExpr("a / b / c // result is 10", {
      a: 100,
      b: 5,
      c: 2,
    });
    expect(result).toBe(10);
  });

  test("Mixed operators with comments", () => {
    const result = evalExpr(
      `
            a /* first */
            / /* divide */
            b /* second */
            * /* multiply */
            c // result`,
      { a: 10, b: 2, c: 3 }
    );
    expect(result).toBe(15);
  });

  test("String concatenation with comment-like syntax", () => {
    const result = evalExpr("$string('URL: ', 'http://example.com')");
    expect(result).toBe("URL: http://example.com");
  });
});
