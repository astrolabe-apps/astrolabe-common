import { describe, test, expect } from "vitest";
import { printExpr } from "../src/printExpr";
import { parseEval } from "../src/parseEval";
import {
  ArrayExpr,
  CallExpr,
  EvalExpr,
  LambdaExpr,
  LetExpr,
  ValueExpr,
  VarExpr,
  PropertyExpr,
} from "../src/ast";
import { toNormalString } from "../src/normalString";

describe("printExpr", () => {
  describe("basic expressions", () => {
    test("prints null", () => {
      const expr: ValueExpr = { type: "value", value: null };
      expect(printExpr(expr)).toBe("null");
    });

    test("prints boolean true", () => {
      const expr: ValueExpr = { type: "value", value: true };
      expect(printExpr(expr)).toBe("true");
    });

    test("prints boolean false", () => {
      const expr: ValueExpr = { type: "value", value: false };
      expect(printExpr(expr)).toBe("false");
    });

    test("prints number", () => {
      const expr: ValueExpr = { type: "value", value: 42 };
      expect(printExpr(expr)).toBe("42");
    });

    test("prints simple string", () => {
      const expr: ValueExpr = { type: "value", value: "hello" };
      expect(printExpr(expr)).toBe('"hello"');
    });

    test("prints property", () => {
      const expr: PropertyExpr = { type: "property", property: "myProp" };
      expect(printExpr(expr)).toBe("myProp");
    });

    test("prints variable", () => {
      const expr: VarExpr = { type: "var", variable: "myVar" };
      expect(printExpr(expr)).toBe("$myVar");
    });

    test("prints array", () => {
      const expr: ArrayExpr = {
        type: "array",
        values: [
          { type: "value", value: 1 },
          { type: "value", value: 2 },
          { type: "value", value: 3 },
        ],
      };
      expect(printExpr(expr)).toBe("[1, 2, 3]");
    });

    test("prints empty array", () => {
      const expr: ArrayExpr = { type: "array", values: [] };
      expect(printExpr(expr)).toBe("[]");
    });
  });

  describe("string escaping", () => {
    test("escapes backslash", () => {
      const expr: ValueExpr = { type: "value", value: "hello\\world" };
      expect(printExpr(expr)).toBe('"hello\\\\world"');
    });

    test("escapes double quotes", () => {
      const expr: ValueExpr = { type: "value", value: 'say "hi"' };
      expect(printExpr(expr)).toBe('"say \\"hi\\""');
    });

    test("escapes newline", () => {
      const expr: ValueExpr = { type: "value", value: "hello\nworld" };
      expect(printExpr(expr)).toBe('"hello\\nworld"');
    });

    test("escapes tab", () => {
      const expr: ValueExpr = { type: "value", value: "hello\tworld" };
      expect(printExpr(expr)).toBe('"hello\\tworld"');
    });

    test("escapes carriage return", () => {
      const expr: ValueExpr = { type: "value", value: "hello\rworld" };
      expect(printExpr(expr)).toBe('"hello\\rworld"');
    });

    test("escapes multiple special characters", () => {
      const expr: ValueExpr = {
        type: "value",
        value: 'line1\nline2\t"quoted"\\backslash',
      };
      expect(printExpr(expr)).toBe(
        '"line1\\nline2\\t\\"quoted\\"\\\\backslash"',
      );
    });
  });

  describe("lambda expressions", () => {
    test("prints simple lambda", () => {
      const expr: LambdaExpr = {
        type: "lambda",
        variable: "x",
        expr: { type: "var", variable: "x" },
      };
      expect(printExpr(expr)).toBe("$x => $x");
    });

    test("prints lambda with computation", () => {
      const expr: LambdaExpr = {
        type: "lambda",
        variable: "x",
        expr: {
          type: "call",
          function: "+",
          args: [
            { type: "var", variable: "x" },
            { type: "value", value: 1 },
          ],
        },
      };
      expect(printExpr(expr)).toBe("$x => $x + 1");
    });
  });

  describe("let expressions", () => {
    test("prints let with single variable", () => {
      const expr: LetExpr = {
        type: "let",
        variables: [[{ type: "var", variable: "x" }, { type: "value", value: 5 }]],
        expr: { type: "var", variable: "x" },
      };
      expect(printExpr(expr)).toBe("let $x := 5 in $x");
    });

    test("prints let with multiple variables", () => {
      const expr: LetExpr = {
        type: "let",
        variables: [
          [{ type: "var", variable: "x" }, { type: "value", value: 1 }],
          [{ type: "var", variable: "y" }, { type: "value", value: 2 }],
        ],
        expr: {
          type: "call",
          function: "+",
          args: [
            { type: "var", variable: "x" },
            { type: "var", variable: "y" },
          ],
        },
      };
      expect(printExpr(expr)).toBe("let $x := 1, $y := 2 in $x + $y");
    });

    test("prints let with zero variables", () => {
      const expr: LetExpr = {
        type: "let",
        variables: [],
        expr: { type: "value", value: 42 },
      };
      expect(printExpr(expr)).toBe("42");
    });
  });

  describe("binary operators", () => {
    test("prints addition", () => {
      const expr: CallExpr = {
        type: "call",
        function: "+",
        args: [
          { type: "value", value: 1 },
          { type: "value", value: 2 },
        ],
      };
      expect(printExpr(expr)).toBe("1 + 2");
    });

    test("prints subtraction", () => {
      const expr: CallExpr = {
        type: "call",
        function: "-",
        args: [
          { type: "value", value: 5 },
          { type: "value", value: 3 },
        ],
      };
      expect(printExpr(expr)).toBe("5 - 3");
    });

    test("prints multiplication", () => {
      const expr: CallExpr = {
        type: "call",
        function: "*",
        args: [
          { type: "value", value: 3 },
          { type: "value", value: 4 },
        ],
      };
      expect(printExpr(expr)).toBe("3 * 4");
    });

    test("prints division", () => {
      const expr: CallExpr = {
        type: "call",
        function: "/",
        args: [
          { type: "value", value: 10 },
          { type: "value", value: 2 },
        ],
      };
      expect(printExpr(expr)).toBe("10 / 2");
    });

    test("prints comparison operators", () => {
      expect(
        printExpr({
          type: "call",
          function: "=",
          args: [
            { type: "value", value: 1 },
            { type: "value", value: 1 },
          ],
        }),
      ).toBe("1 = 1");

      expect(
        printExpr({
          type: "call",
          function: "!=",
          args: [
            { type: "value", value: 1 },
            { type: "value", value: 2 },
          ],
        }),
      ).toBe("1 != 2");

      expect(
        printExpr({
          type: "call",
          function: "<",
          args: [
            { type: "value", value: 1 },
            { type: "value", value: 2 },
          ],
        }),
      ).toBe("1 < 2");

      expect(
        printExpr({
          type: "call",
          function: ">",
          args: [
            { type: "value", value: 2 },
            { type: "value", value: 1 },
          ],
        }),
      ).toBe("2 > 1");
    });

    test("prints logical operators", () => {
      expect(
        printExpr({
          type: "call",
          function: "and",
          args: [
            { type: "value", value: true },
            { type: "value", value: false },
          ],
        }),
      ).toBe("true and false");

      expect(
        printExpr({
          type: "call",
          function: "or",
          args: [
            { type: "value", value: true },
            { type: "value", value: false },
          ],
        }),
      ).toBe("true or false");
    });
  });

  describe("property access and filter", () => {
    test("prints property access", () => {
      const expr: CallExpr = {
        type: "call",
        function: ".",
        args: [
          { type: "property", property: "obj" },
          { type: "property", property: "field" },
        ],
      };
      expect(printExpr(expr)).toBe("obj.field");
    });

    test("prints array filter", () => {
      const expr: CallExpr = {
        type: "call",
        function: "[",
        args: [
          { type: "property", property: "arr" },
          { type: "value", value: 0 },
        ],
      };
      expect(printExpr(expr)).toBe("arr[0]");
    });
  });

  describe("ternary operator", () => {
    test("prints ternary expression", () => {
      const expr: CallExpr = {
        type: "call",
        function: "?",
        args: [
          {
            type: "call",
            function: ">",
            args: [
              { type: "property", property: "x" },
              { type: "value", value: 0 },
            ],
          },
          { type: "value", value: 1 },
          { type: "value", value: -1 },
        ],
      };
      expect(printExpr(expr)).toBe("x > 0 ? 1 : -1");
    });
  });

  describe("object literals", () => {
    test("prints empty object", () => {
      const expr: CallExpr = {
        type: "call",
        function: "object",
        args: [],
      };
      expect(printExpr(expr)).toBe("{}");
    });

    test("prints object with single property", () => {
      const expr: CallExpr = {
        type: "call",
        function: "object",
        args: [
          { type: "value", value: "name" },
          { type: "value", value: "John" },
        ],
      };
      expect(printExpr(expr)).toBe('{"name": "John"}');
    });

    test("prints object with multiple properties", () => {
      const expr: CallExpr = {
        type: "call",
        function: "object",
        args: [
          { type: "value", value: "name" },
          { type: "value", value: "John" },
          { type: "value", value: "age" },
          { type: "value", value: 30 },
        ],
      };
      expect(printExpr(expr)).toBe('{"name": "John", "age": 30}');
    });
  });

  describe("template strings", () => {
    test("prints template string with single interpolation", () => {
      const expr: CallExpr = {
        type: "call",
        function: "string",
        args: [
          { type: "value", value: "Hello " },
          { type: "property", property: "name" },
        ],
      };
      expect(printExpr(expr)).toBe("`Hello {name}`");
    });

    test("prints template string with multiple interpolations", () => {
      const expr: CallExpr = {
        type: "call",
        function: "string",
        args: [
          { type: "value", value: "User: " },
          { type: "property", property: "name" },
          { type: "value", value: ", Age: " },
          { type: "property", property: "age" },
        ],
      };
      expect(printExpr(expr)).toBe("`User: {name}, Age: {age}`");
    });

    test("escapes backticks in template strings", () => {
      const expr: CallExpr = {
        type: "call",
        function: "string",
        args: [
          { type: "value", value: "Use ` for code" },
          { type: "property", property: "x" },
        ],
      };
      expect(printExpr(expr)).toBe("`Use \\` for code{x}`");
    });
  });

  describe("operator precedence", () => {
    test("prints multiplication with higher precedence than addition", () => {
      const expr: CallExpr = {
        type: "call",
        function: "+",
        args: [
          { type: "value", value: 1 },
          {
            type: "call",
            function: "*",
            args: [
              { type: "value", value: 2 },
              { type: "value", value: 3 },
            ],
          },
        ],
      };
      expect(printExpr(expr)).toBe("1 + 2 * 3");
    });

    test("adds parentheses when needed for precedence", () => {
      const expr: CallExpr = {
        type: "call",
        function: "*",
        args: [
          {
            type: "call",
            function: "+",
            args: [
              { type: "value", value: 1 },
              { type: "value", value: 2 },
            ],
          },
          { type: "value", value: 3 },
        ],
      };
      expect(printExpr(expr)).toBe("(1 + 2) * 3");
    });

    test("handles comparison with lower precedence than arithmetic", () => {
      const expr: CallExpr = {
        type: "call",
        function: "<",
        args: [
          {
            type: "call",
            function: "+",
            args: [
              { type: "property", property: "x" },
              { type: "value", value: 1 },
            ],
          },
          { type: "value", value: 10 },
        ],
      };
      expect(printExpr(expr)).toBe("x + 1 < 10");
    });

    test("handles logical operators with lowest precedence", () => {
      const expr: CallExpr = {
        type: "call",
        function: "and",
        args: [
          {
            type: "call",
            function: ">",
            args: [
              { type: "property", property: "x" },
              { type: "value", value: 0 },
            ],
          },
          {
            type: "call",
            function: "<",
            args: [
              { type: "property", property: "x" },
              { type: "value", value: 10 },
            ],
          },
        ],
      };
      expect(printExpr(expr)).toBe("x > 0 and x < 10");
    });

    test("adds parentheses for logical operators in comparison", () => {
      const expr: CallExpr = {
        type: "call",
        function: "<",
        args: [
          {
            type: "call",
            function: "and",
            args: [
              { type: "property", property: "x" },
              { type: "property", property: "y" },
            ],
          },
          { type: "value", value: 10 },
        ],
      };
      expect(printExpr(expr)).toBe("(x and y) < 10");
    });

    test("handles left-associativity for same precedence operators", () => {
      const expr: CallExpr = {
        type: "call",
        function: "-",
        args: [
          {
            type: "call",
            function: "-",
            args: [
              { type: "value", value: 10 },
              { type: "value", value: 5 },
            ],
          },
          { type: "value", value: 3 },
        ],
      };
      expect(printExpr(expr)).toBe("10 - 5 - 3");
    });

    test("adds parentheses when breaking left-associativity", () => {
      const expr: CallExpr = {
        type: "call",
        function: "-",
        args: [
          { type: "value", value: 10 },
          {
            type: "call",
            function: "-",
            args: [
              { type: "value", value: 5 },
              { type: "value", value: 3 },
            ],
          },
        ],
      };
      expect(printExpr(expr)).toBe("10 - (5 - 3)");
    });
  });

  describe("function calls", () => {
    test("prints custom function call", () => {
      const expr: CallExpr = {
        type: "call",
        function: "myFunc",
        args: [
          { type: "value", value: 1 },
          { type: "value", value: 2 },
        ],
      };
      expect(printExpr(expr)).toBe("$myFunc(1, 2)");
    });

    test("prints function call with no arguments", () => {
      const expr: CallExpr = {
        type: "call",
        function: "noArgs",
        args: [],
      };
      expect(printExpr(expr)).toBe("$noArgs()");
    });
  });

  describe("ValueExpr with object/array values", () => {
    test("prints ValueExpr with object value", () => {
      const expr: ValueExpr = {
        type: "value",
        value: {
          name: { type: "value", value: "John" },
          age: { type: "value", value: 30 }
        }
      };
      const printed = printExpr(expr);

      expect(printed).toContain('"name":');
      expect(printed).toContain('"John"');
      expect(printed).toContain('"age":');
      expect(printed).toContain("30");
      expect(printed).toMatch(/^\{.*\}$/);
    });

    test("prints ValueExpr with empty object", () => {
      const expr: ValueExpr = {
        type: "value",
        value: {}
      };
      expect(printExpr(expr)).toBe("{}");
    });

    test("prints ValueExpr with array value", () => {
      const expr: ValueExpr = {
        type: "value",
        value: [
          { type: "value", value: 1 },
          { type: "value", value: 2 },
          { type: "value", value: 3 }
        ]
      };
      expect(printExpr(expr)).toBe("[1, 2, 3]");
    });

    test("prints ValueExpr with nested object", () => {
      const expr: ValueExpr = {
        type: "value",
        value: {
          user: {
            type: "value",
            value: {
              name: { type: "value", value: "Jane" }
            }
          }
        }
      };
      const printed = printExpr(expr);
      expect(printed).toContain('"user":');
      expect(printed).toContain('"name":');
      expect(printed).toContain('"Jane"');
    });
  });

  describe("round-trip parsing", () => {
    // Helper function to test round-trip conversion
    function testRoundTrip(input: string) {
      const parsed1 = parseEval(input);
      const printed = printExpr(parsed1);
      const parsed2 = parseEval(printed);

      // Use toNormalString for comparison as it provides canonical representation
      expect(toNormalString(parsed2)).toBe(toNormalString(parsed1));
    }

    test("round-trips simple expressions", () => {
      testRoundTrip("42");
      testRoundTrip("true");
      testRoundTrip("false");
      testRoundTrip("null");
      testRoundTrip('"hello"');
      testRoundTrip("myProp");
      testRoundTrip("$myVar");
    });

    test("round-trips string with escapes", () => {
      testRoundTrip('"hello\\nworld"');
      testRoundTrip('"say \\"hi\\""');
      testRoundTrip('"back\\\\slash"');
      testRoundTrip('"tab\\there"');
    });

    test("round-trips arrays", () => {
      testRoundTrip("[1, 2, 3]");
      testRoundTrip("[]");
      testRoundTrip('["a", "b", "c"]');
    });

    test("round-trips lambdas", () => {
      testRoundTrip("$x => $x");
      testRoundTrip("$x => $x + 1");
      testRoundTrip("$n => $n * 2");
    });

    test("round-trips let expressions", () => {
      testRoundTrip("let $x := 5 in $x");
      testRoundTrip("let $x := 1, $y := 2 in $x + $y");
      testRoundTrip("let $a := 10, $b := 20, $c := 30 in $a + $b + $c");
    });

    test("round-trips binary operators", () => {
      testRoundTrip("1 + 2");
      testRoundTrip("5 - 3");
      testRoundTrip("3 * 4");
      testRoundTrip("10 / 2");
      testRoundTrip("x = y");
      testRoundTrip("x != y");
      testRoundTrip("x < y");
      testRoundTrip("x > y");
      testRoundTrip("x <= y");
      testRoundTrip("x >= y");
      testRoundTrip("true and false");
      testRoundTrip("true or false");
    });

    test("round-trips property access and filter", () => {
      testRoundTrip("obj.field");
      testRoundTrip("arr[0]");
      testRoundTrip("user.name");
    });

    test("round-trips ternary operator", () => {
      testRoundTrip("x > 0 ? 1 : -1");
      testRoundTrip("valid ? value : default");
    });

    test("round-trips object literals", () => {
      testRoundTrip("{}");
      testRoundTrip("{name: \"John\"}");
      testRoundTrip("{name: \"John\", age: 30}");
      testRoundTrip("{x: 1, y: 2, z: 3}");
      testRoundTrip("{\"a\": 1, \"b\": 1}"); // quoted keys
    });

    test("round-trips template strings", () => {
      testRoundTrip("`Hello ${name}`");
      testRoundTrip("`User: ${name}, Age: ${age}`");
      testRoundTrip("`Count: ${x + 1}`");
    });

    test("round-trips complex expressions with precedence", () => {
      testRoundTrip("1 + 2 * 3");
      testRoundTrip("(1 + 2) * 3");
      testRoundTrip("x + 1 < 10");
      testRoundTrip("x > 0 and x < 10");
      testRoundTrip("10 - 5 - 3");
      testRoundTrip("10 - (5 - 3)");
    });

    test("round-trips nested expressions", () => {
      testRoundTrip("obj.field.subfield");
      testRoundTrip("arr[0][1]");
      testRoundTrip("$f($g($x))");
      testRoundTrip("let $x := let $y := 1 in $y in $x");
    });

    test("round-trips mixed complex expressions", () => {
      testRoundTrip("let $x := 5, $y := 10 in $x + $y * 2");
      testRoundTrip("($x => $x + 1)(5)");
      testRoundTrip("{x: 1, y: 2}.x");
      testRoundTrip("[1, 2, 3][0]");
      testRoundTrip("x > 0 ? {value: x} : {value: 0}");
    });
  });
});
