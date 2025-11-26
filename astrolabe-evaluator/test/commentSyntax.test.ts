import { describe, expect, test } from "vitest";
import { evalExpr, evalResult, evalToArray } from "./testHelpers";
import { basicEnv } from "../src/defaultFunctions";
import { parseEval } from "../src/parseEval";
import { toNative } from "../src/ast";

/**
 * Tests for comment syntax support in the evaluator.
 * Tests both line comments and block comments
 */

describe("Line Comments", () => {
  test("Line comment after expression", () => {
    const result = evalExpr("a + b // this is a comment", { a: 5, b: 3 });
    expect(result).toBe(8);
  });

  test("Line comment before newline and continuation", () => {
    const result = evalExpr("a + b // add a and b\n+ c", { a: 5, b: 3, c: 2 });
    expect(result).toBe(10);
  });

  test("Line comment in middle of expression", () => {
    const result = evalExpr("(a // first value\n- b) // subtract b\n* c", {
      a: 10,
      b: 5,
      c: 2,
    });
    expect(result).toBe(10); // (a - b) * c = (10 - 5) * 2 = 10
  });

  test("Line comment with conditional expression", () => {
    const result = evalExpr(
      "x > y // check if x is greater\n? x // return x\n: y // return y",
      { x: 10, y: 5 },
    );
    expect(result).toBe(10);
  });
});

describe("Block Comments", () => {
  test("Block comment before expression", () => {
    const result = evalExpr("/* calculate sum */ a + b", { a: 5, b: 3 });
    expect(result).toBe(8);
  });

  test("Block comment after expression", () => {
    const result = evalExpr("a + b /* sum of a and b */", { a: 5, b: 3 });
    expect(result).toBe(8);
  });

  test("Block comment in middle of expression", () => {
    const result = evalExpr("a /* first value */ + /* operator */ b", {
      a: 5,
      b: 3,
    });
    expect(result).toBe(8);
  });

  test("Block comment multiline", () => {
    const result = evalExpr(
      `a + b /* this is a
        multiline
        comment */`,
      { a: 5, b: 3 },
    );
    expect(result).toBe(8);
  });

  test("Block comment with division operator", () => {
    const result = evalExpr("a /* divide */ / b", { a: 10, b: 2 });
    expect(result).toBe(5);
  });

  test("Block comment multiple separate comments", () => {
    const result = evalExpr("/* first */ a + /* second */ b - /* third */ c", {
      a: 10,
      b: 3,
      c: 2,
    });
    expect(result).toBe(11);
  });
});

describe("Mixed Comments", () => {
  test("Mixed line and block comments", () => {
    const result = evalExpr("/* block comment */ a + b // line comment", {
      a: 5,
      b: 3,
    });
    expect(result).toBe(8);
  });

  test("Mixed comments in complex expression", () => {
    const result = evalExpr(
      `
            /* Calculate a complex expression */
            x // start with x
            * y // multiply by y
            / /* divide by */ z // z value
        `,
      { x: 10, y: 5, z: 2 },
    );
    expect(result).toBe(25);
  });
});

describe("Comments with Different Expression Types", () => {
  test("Comments with let expression", () => {
    const result = evalExpr(`
            /* define variables */
            let $a := 5, // first var
                $b := 3  /* second var */
            in $a + $b // return sum
        `);
    expect(result).toBe(8);
  });

  test("Comments with lambda expression", () => {
    const result = evalToArray(
      `
            nums[/* filter */ $i => $this() > 2 // greater than 2
            ]
        `,
      { nums: [1, 2, 3, 4, 5] },
    );
    expect(result).toEqual([3, 4, 5]);
  });

  test("Comments with function call", () => {
    const result = evalExpr(
      `
            $sum(/* array parameter */ nums) // calculate sum
        `,
      { nums: [1, 2, 3, 4, 5] },
    );
    expect(result).toBe(15);
  });

  test("Comments with array literal", () => {
    const result = evalToArray(`
            [
                1, // first
                2, /* second */
                3  // third
            ]
        `);
    expect(result).toEqual([1, 2, 3]);
  });

  test("Comments with object literal", () => {
    const env = basicEnv({});
    const parsed = parseEval('$object("a", 1, "b", 2) /* create object */');
    const result = evalResult(env, parsed);
    expect(toNative(result)).toEqual({ a: 1, b: 2 });
  });

  test("Comments with template string", () => {
    const result = evalExpr("`Hello /* comment */ World` // template string");
    expect(result).toBe("Hello /* comment */ World");
  });
});

describe("Edge Cases", () => {
  test("Empty block comment", () => {
    const result = evalExpr("a /**/ + /**/ b", { a: 5, b: 3 });
    expect(result).toBe(8);
  });

  test("Line comment at end of input", () => {
    const result = evalExpr("a // comment at end", { a: 5 });
    expect(result).toBe(5);
  });

  test("Only whitespace after line comment", () => {
    const result = evalExpr("a // comment\n   ", { a: 5 });
    expect(result).toBe(5);
  });

  test("Block comment with asterisk", () => {
    const result = evalExpr("a /* ** */ ", { a: 5 });
    expect(result).toBe(5);
  });
});
