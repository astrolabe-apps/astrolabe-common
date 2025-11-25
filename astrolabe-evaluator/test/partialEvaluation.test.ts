import { describe, test, expect } from "vitest";
import {
  valueExpr,
  varExpr,
  callExpr,
  propertyExpr,
  letExpr,
  arrayExpr,
  EvalEnv,
  ValueExpr,
  EvalExpr,
} from "../src/ast";
import { printExpr } from "../src/printExpr";
import { basicEnv, partialEnv } from "../src/defaultFunctions";
import { evalPartial, evalWithErrors } from "./testHelpers";

/**
 * Create an environment for partial evaluation testing.
 * If data is undefined, the environment supports symbolic evaluation (no data context).
 */
function createPartialEnv(data?: any): EvalEnv {
  return partialEnv(data);
}

/**
 * Create an environment for full evaluation testing (returns errors for unknown variables).
 */
function createBasicEnv(data?: any): EvalEnv {
  return basicEnv(data);
}

describe("Partial Evaluation", () => {
  describe("Unknown Variables", () => {
    test("unknown variable returns VarExpr", () => {
      const env = createPartialEnv();
      const expr = varExpr("unknownVar");
      const result = evalPartial(env, expr);

      expect(result.type).toBe("var");
      expect(printExpr(result)).toBe("$unknownVar");
    });

    test("evaluate() returns error for unknown variable", () => {
      const env = createBasicEnv();
      const expr = varExpr("unknownVar");
      const { result, errors } = evalWithErrors(env, expr);

      expect(result.type).toBe("value");
      expect(result.value).toBe(null);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("unknownVar");
    });

    test("known variable evaluates fully", () => {
      const env = createPartialEnv().newScope({ x: valueExpr(42) });
      const expr = varExpr("x");
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(42);
    });
  });

  describe("Property Access Without Data", () => {
    test("property access without data returns PropertyExpr", () => {
      const env = createPartialEnv(); // No data
      const expr = propertyExpr("name");
      const result = evalPartial(env, expr);

      expect(result.type).toBe("property");
      expect(printExpr(result)).toBe("name");
    });

    test("evaluate() returns error for property without data", () => {
      const env = createBasicEnv();
      const expr = propertyExpr("name");
      const { result, errors } = evalWithErrors(env, expr);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("Property name cannot be accessed");
    });
  });

  describe("Arithmetic with Unknowns", () => {
    test("addition with unknown variable returns symbolic CallExpr", () => {
      const env = createPartialEnv().newScope({ x: varExpr("unknownX") });
      const expr = callExpr("+", [valueExpr(5), varExpr("x")]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toBe("5 + $unknownX");
    });

    test("addition with all known values fully evaluates", () => {
      const env = createPartialEnv();
      const expr = callExpr("+", [valueExpr(5), valueExpr(3)]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(8);
      expect(printExpr(result)).toBe("8");
    });

    test("nested arithmetic with partial unknowns", () => {
      const env = createPartialEnv().newScope({ y: varExpr("unknownY") });
      const expr = callExpr("*", [
        callExpr("+", [valueExpr(2), valueExpr(3)]),
        varExpr("y"),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      // Inner add should be evaluated to 5
      expect(printExpr(result)).toBe("5 * $unknownY");
    });

    test("complex expression with multiple unknowns", () => {
      const env = createPartialEnv().newScope({
        a: varExpr("unknownA"),
        b: varExpr("unknownB"),
      });
      const expr = callExpr("+", [
        callExpr("*", [varExpr("a"), valueExpr(2)]),
        callExpr("*", [varExpr("b"), valueExpr(3)]),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toBe("$unknownA * 2 + $unknownB * 3");
    });
  });

  describe("Conditional Branch Selection", () => {
    test("if with true condition evaluates then branch only", () => {
      const env = createPartialEnv();
      const expr = callExpr("?", [
        valueExpr(true),
        valueExpr("yes"),
        valueExpr("no"),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe("yes");
      expect(printExpr(result)).toBe('"yes"');
    });

    test("if with false condition evaluates else branch only", () => {
      const env = createPartialEnv();
      const expr = callExpr("?", [
        valueExpr(false),
        valueExpr("yes"),
        valueExpr("no"),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe("no");
      expect(printExpr(result)).toBe('"no"');
    });

    test("if with unknown condition returns symbolic", () => {
      const env = createPartialEnv().newScope({ cond: varExpr("unknownCond") });
      const expr = callExpr("?", [
        varExpr("cond"),
        valueExpr("yes"),
        valueExpr("no"),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toBe('$unknownCond ? "yes" : "no"');
    });

    test("nested conditionals with branch elimination", () => {
      const env = createPartialEnv().newScope({ x: varExpr("unknownX") });
      const expr = callExpr("?", [
        valueExpr(true),
        callExpr("+", [varExpr("x"), valueExpr(1)]),
        callExpr("+", [varExpr("x"), valueExpr(2)]),
      ]);
      const result = evalPartial(env, expr);

      // True branch selected, else branch not evaluated
      expect(printExpr(result)).toBe("$unknownX + 1");
    });
  });

  describe("Let Expression Simplification", () => {
    test("dead variable elimination - unused variable removed", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [
          [varExpr("x"), valueExpr(5)],
          [varExpr("y"), valueExpr(10)],
        ],
        varExpr("y"), // Only uses y
      );
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(10);
      expect(printExpr(result)).toBe("10");
    });

    test("constant propagation - simple values inlined", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [[varExpr("x"), valueExpr(5)]],
        callExpr("+", [varExpr("x"), valueExpr(3)]),
      );
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(8);
      expect(printExpr(result)).toBe("8");
    });

    test("let flattening - all bindings inlined", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [
          [varExpr("a"), valueExpr(2)],
          [varExpr("b"), valueExpr(3)],
        ],
        callExpr("*", [varExpr("a"), varExpr("b")]),
      );
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(6);
    });

    test("partial let - keeps symbolic bindings", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [
          [varExpr("x"), varExpr("unknownX")],
          [varExpr("y"), valueExpr(5)],
        ],
        callExpr("+", [varExpr("x"), varExpr("y")]),
      );
      const result = evalPartial(env, expr);

      // After variable resolution, both x and y are inlined/substituted
      expect(printExpr(result)).toBe("$unknownX + 5");
    });

    test("dependent bindings with partial evaluation", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [
          [varExpr("x"), valueExpr(5)],
          [varExpr("y"), callExpr("+", [varExpr("x"), valueExpr(3)])],
          [varExpr("z"), callExpr("*", [varExpr("y"), valueExpr(2)])],
        ],
        varExpr("z"),
      );
      const result = evalPartial(env, expr);

      // All should evaluate: x=5, y=8, z=16
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(16);
    });

    test("mixed symbolic and concrete in let", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [
          [varExpr("a"), varExpr("unknownA")],
          [varExpr("b"), valueExpr(10)],
          [varExpr("c"), callExpr("*", [varExpr("a"), valueExpr(2)])],
        ],
        callExpr("+", [varExpr("c"), varExpr("b")]),
      );
      const result = evalPartial(env, expr);

      // Simple values and VarExprs are inlined, CallExpr bindings are now also inlined
      expect(printExpr(result)).toBe("$unknownA * 2 + 10");
    });
  });

  describe("Variable Shadowing", () => {
    test("inner variable shadows outer", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [[varExpr("x"), valueExpr(5)]],
        letExpr([[varExpr("x"), valueExpr(10)]], varExpr("x")),
      );
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(10);
    });

    test("shadowing with partial evaluation", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [[varExpr("x"), varExpr("unknownX")]],
        letExpr(
          [[varExpr("x"), valueExpr(42)]],
          callExpr("+", [varExpr("x"), valueExpr(1)]),
        ),
      );
      const result = evalPartial(env, expr);

      // Inner x=42 shadows outer x=unknownX
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(43);
    });
  });

  describe("Array Partial Evaluation", () => {
    test("array with all known values evaluates fully", () => {
      const env = createPartialEnv();
      const expr = arrayExpr([valueExpr(1), valueExpr(2), valueExpr(3)]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect(Array.isArray((result as ValueExpr).value)).toBe(true);
      expect(printExpr(result)).toBe("[1, 2, 3]");
    });

    test("array with unknown element returns ArrayExpr", () => {
      const env = createPartialEnv().newScope({ x: varExpr("unknownX") });
      const expr = arrayExpr([valueExpr(1), varExpr("x"), valueExpr(3)]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("array");
      expect(printExpr(result)).toBe("[1, $unknownX, 3]");
    });

    test("array with expressions partially evaluates elements", () => {
      const env = createPartialEnv().newScope({ y: varExpr("unknownY") });
      const expr = arrayExpr([
        callExpr("+", [valueExpr(1), valueExpr(2)]),
        callExpr("*", [varExpr("y"), valueExpr(3)]),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("array");
      expect(printExpr(result)).toBe("[3, $unknownY * 3]");
    });
  });

  describe("Nested Partial Evaluation", () => {
    test("deeply nested let expressions", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [[varExpr("a"), valueExpr(1)]],
        letExpr(
          [[varExpr("b"), callExpr("+", [varExpr("a"), valueExpr(2)])]],
          letExpr(
            [[varExpr("c"), callExpr("+", [varExpr("b"), valueExpr(3)])]],
            varExpr("c"),
          ),
        ),
      );
      const result = evalPartial(env, expr);

      // Should fully evaluate: a=1, b=3, c=6
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(6);
    });

    test("nested conditionals with partial conditions", () => {
      const env = createPartialEnv().newScope({
        cond1: varExpr("unknownCond1"),
        cond2: varExpr("unknownCond2"),
      });

      const expr = callExpr("?", [
        valueExpr(true),
        callExpr("?", [varExpr("cond1"), valueExpr("a"), valueExpr("b")]),
        callExpr("?", [varExpr("cond2"), valueExpr("c"), valueExpr("d")]),
      ]);
      const result = evalPartial(env, expr);

      // Outer true eliminates else branch entirely
      expect(printExpr(result)).toBe('$unknownCond1 ? "a" : "b"');
    });
  });

  describe("Complex Real-World Scenarios", () => {
    test("formula with mix of known and unknown inputs", () => {
      const env = createPartialEnv().newScope({
        price: varExpr("userInputPrice"),
        taxRate: valueExpr(0.08),
        discount: valueExpr(0.1),
      });

      const expr = letExpr(
        [
          [varExpr("subtotal"), varExpr("price")],
          [
            varExpr("discountedPrice"),
            callExpr("*", [
              varExpr("subtotal"),
              callExpr("-", [valueExpr(1), varExpr("discount")]),
            ]),
          ],
          [
            varExpr("total"),
            callExpr("*", [
              varExpr("discountedPrice"),
              callExpr("+", [valueExpr(1), varExpr("taxRate")]),
            ]),
          ],
        ],
        varExpr("total"),
      );

      const result = evalPartial(env, expr);

      // All calculations are now fully inlined
      const printed = printExpr(result);
      expect(printed).toBe("$userInputPrice * 0.9 * 1.08");
    });

    test("conditional with side computations", () => {
      const env = createPartialEnv().newScope({
        isVIP: varExpr("userIsVIP"),
        basePrice: valueExpr(100),
      });

      const expr = callExpr("?", [
        varExpr("isVIP"),
        callExpr("*", [varExpr("basePrice"), valueExpr(0.8)]), // 20% discount
        varExpr("basePrice"),
      ]);

      const result = evalPartial(env, expr);

      // Condition unknown, but branches should be partially evaluated
      expect(printExpr(result)).toBe("$userIsVIP ? 80 : 100");
    });
  });

  describe("Edge Cases", () => {
    test("empty let expression", () => {
      const env = createPartialEnv();
      const expr = letExpr([], valueExpr(42));
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(42);
    });

    test("self-referential bindings fail gracefully", () => {
      const env = createPartialEnv();
      const expr = letExpr([[varExpr("x"), varExpr("x")]], varExpr("x"));
      const result = evalPartial(env, expr);

      // x references itself, which becomes symbolic
      expect(printExpr(result)).toContain("$x");
    });

    test("null and undefined handling", () => {
      const env = createPartialEnv();
      const expr = callExpr("+", [valueExpr(null), valueExpr(5)]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(null);
    });
  });

  describe("Array Operations with Symbolic Values", () => {
    test("flatmap over symbolic array", () => {
      const env = createPartialEnv();
      const expr = letExpr(
        [[varExpr("a"), arrayExpr([valueExpr(1), valueExpr(2), varExpr("z")])]],
        callExpr(".", [
          varExpr("a"),
          callExpr("*", [callExpr("this", []), valueExpr(2)]),
        ]),
      );
      const result = evalPartial(env, expr);

      // Array binding is inlined into the flatmap call
      expect(result.type).toBe("call");
      expect(printExpr(result)).toContain("*");
    });

    test("map over symbolic array returns symbolic result", () => {
      const env = createPartialEnv().newScope({ arr: varExpr("unknownArr") });
      const expr = callExpr("map", [
        varExpr("arr"),
        callExpr("+", [callExpr("this", []), valueExpr(1)]),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toBe("$map($unknownArr, $this() + 1)");
    });

    test("map over concrete array evaluates fully", () => {
      const env = createPartialEnv();
      const expr = callExpr("map", [
        arrayExpr([valueExpr(1), valueExpr(2), valueExpr(3)]),
        callExpr("*", [callExpr("this", []), valueExpr(2)]),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect(printExpr(result)).toBe("[2, 4, 6]");
    });

    test("filter with symbolic array", () => {
      const env = createPartialEnv().newScope({ items: varExpr("unknownItems") });
      const expr = callExpr("filter", [
        varExpr("items"),
        callExpr(">", [callExpr("this", []), valueExpr(10)]),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toContain("filter");
      expect(printExpr(result)).toContain("items");
    });

    test("sum over symbolic array", () => {
      const env = createPartialEnv().newScope({ nums: varExpr("unknownNums") });
      const expr = callExpr("sum", [varExpr("nums")]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toBe("$sum($unknownNums)");
    });

    test("sum over concrete array evaluates", () => {
      const env = createPartialEnv();
      const expr = callExpr("sum", [
        arrayExpr([valueExpr(1), valueExpr(2), valueExpr(3)]),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(6);
    });

    test("count with symbolic array", () => {
      const env = createPartialEnv().newScope({ items: varExpr("unknownItems") });
      const expr = callExpr("count", [varExpr("items")]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toBe("$count($unknownItems)");
    });

    test("elem with symbolic array index", () => {
      const env = createPartialEnv().newScope({ idx: varExpr("unknownIndex") });
      const expr = callExpr("elem", [
        arrayExpr([valueExpr("a"), valueExpr("b"), valueExpr("c")]),
        varExpr("idx"),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toContain("elem");
      expect(printExpr(result)).toContain("unknownIndex");
    });

    test("elem with symbolic array", () => {
      const env = createPartialEnv().newScope({ arr: varExpr("unknownArr") });
      const expr = callExpr("elem", [varExpr("arr"), valueExpr(0)]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toBe("$elem($unknownArr, 0)");
    });

    test("elem with concrete values evaluates", () => {
      const env = createPartialEnv();
      const expr = callExpr("elem", [
        arrayExpr([valueExpr(10), valueExpr(20), valueExpr(30)]),
        valueExpr(1),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(20);
    });

    test("nested array operations with partial unknowns", () => {
      const env = createPartialEnv().newScope({ base: varExpr("unknownBase") });
      const expr = callExpr("sum", [
        callExpr("map", [
          arrayExpr([valueExpr(1), valueExpr(2), valueExpr(3)]),
          callExpr("+", [callExpr("this", []), varExpr("base")]),
        ]),
      ]);
      const result = evalPartial(env, expr);

      // Map returns symbolic because base is unknown, so sum also returns symbolic
      expect(result.type).toBe("call");
      expect(printExpr(result)).toContain("sum");
    });

    test("array with mixed symbolic elements", () => {
      const env = createPartialEnv().newScope({
        x: varExpr("unknownX"),
        y: valueExpr(5),
      });

      const expr = arrayExpr([
        valueExpr(1),
        varExpr("x"),
        callExpr("+", [varExpr("y"), valueExpr(3)]),
      ]);
      const result = evalPartial(env, expr);

      // y is known (5), so y+3=8, but x is unknown
      expect(result.type).toBe("array");
      expect(printExpr(result)).toBe("[1, $unknownX, 8]");
    });

    test("first with symbolic array", () => {
      const env = createPartialEnv().newScope({ items: varExpr("unknownItems") });
      const expr = callExpr("first", [
        varExpr("items"),
        callExpr(">", [callExpr("this", []), valueExpr(5)]),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toContain("first");
      expect(printExpr(result)).toContain("unknownItems");
    });

    test("object function with symbolic value", () => {
      const env = createPartialEnv().newScope({ val: varExpr("unknownVal") });
      const expr = callExpr("object", [valueExpr("key"), varExpr("val")]);
      const result = evalPartial(env, expr);

      // The result depends on implementation - just verify it handles symbolic values
      // Currently returns a value with symbolic field
      expect(printExpr(result)).toBe('{"key": $unknownVal}');
    });

    test("keys function with symbolic object", () => {
      const env = createPartialEnv().newScope({ obj: varExpr("unknownObj") });
      const expr = callExpr("keys", [varExpr("obj")]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toBe("$keys($unknownObj)");
    });

    test("merge with symbolic object", () => {
      const env = createPartialEnv().newScope({ obj1: varExpr("unknownObj") });
      const expr = callExpr("merge", [
        callExpr("object", [valueExpr("a"), valueExpr(1)]),
        varExpr("obj1"),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("call");
      expect(printExpr(result)).toContain("merge");
    });
  });

  describe("Boolean Identity Simplification", () => {
    test("comparison in boolean expression substitutes defined variables", () => {
      const env = createPartialEnv().newScope({ FreightMaxWidth: valueExpr(12) });
      const expr = callExpr("and", [
        callExpr("<=", [propertyExpr("height"), varExpr("FreightMaxHeight")]),
        callExpr("<=", [propertyExpr("width"), varExpr("FreightMaxWidth")]),
      ]);
      const result = evalPartial(env, expr);

      // Should partially evaluate: FreightMaxWidth should be substituted
      const printed = printExpr(result);
      expect(printed).toContain("12");
      expect(printed).not.toContain("FreightMaxWidth");
    });

    test("true and X simplifies to X", () => {
      const env = createPartialEnv();
      const expr = callExpr("and", [valueExpr(true), varExpr("unknown")]);
      const result = evalPartial(env, expr);

      // Should simplify to just $unknown
      expect(result.type).toBe("var");
      expect((result as any).variable).toBe("unknown");
    });

    test("false or X simplifies to X", () => {
      const env = createPartialEnv();
      const expr = callExpr("or", [valueExpr(false), varExpr("unknown")]);
      const result = evalPartial(env, expr);

      // Should simplify to just $unknown
      expect(result.type).toBe("var");
      expect((result as any).variable).toBe("unknown");
    });

    test("X and true and Y filters out true", () => {
      const env = createPartialEnv();
      const expr = callExpr("and", [
        varExpr("x"),
        valueExpr(true),
        varExpr("y"),
      ]);
      const result = evalPartial(env, expr);

      // Should simplify to: $x and $y (true filtered out)
      const printed = printExpr(result);
      expect(printed).not.toContain("true");
      expect(printed).toContain("$x");
      expect(printed).toContain("$y");
    });

    test("X or false or Y filters out false", () => {
      const env = createPartialEnv();
      const expr = callExpr("or", [
        varExpr("x"),
        valueExpr(false),
        varExpr("y"),
      ]);
      const result = evalPartial(env, expr);

      // Should simplify to: $x or $y (false filtered out)
      const printed = printExpr(result);
      expect(printed).not.toContain("false");
      expect(printed).toContain("$x");
      expect(printed).toContain("$y");
    });

    test("all identity values for AND returns true", () => {
      const env = createPartialEnv();
      const expr = callExpr("and", [
        valueExpr(true),
        valueExpr(true),
        valueExpr(true),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(true);
    });

    test("all identity values for OR returns false", () => {
      const env = createPartialEnv();
      const expr = callExpr("or", [
        valueExpr(false),
        valueExpr(false),
        valueExpr(false),
      ]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(false);
    });
  });

  describe("Null Propagation with Symbolic Values", () => {
    test("null with symbolic in binary op simplifies to null", () => {
      const env = createPartialEnv();
      const expr = callExpr("+", [varExpr("x"), valueExpr(null)]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(null);
    });

    test("null with symbolic in comparison simplifies to null", () => {
      const env = createPartialEnv();
      const expr = callExpr("<=", [varExpr("x"), valueExpr(null)]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(null);
    });

    test("null with symbolic in AND simplifies to null", () => {
      const env = createPartialEnv();
      const expr = callExpr("and", [varExpr("x"), valueExpr(null)]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(null);
    });

    test("null with symbolic in OR simplifies to null", () => {
      const env = createPartialEnv();
      const expr = callExpr("or", [valueExpr(null), varExpr("y")]);
      const result = evalPartial(env, expr);

      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(null);
    });
  });

  describe("Uninlining", () => {
    describe("Basic Uninlining", () => {
      test("variable used twice with sufficient complexity is uninlined", () => {
        const env = createPartialEnv();
        // let c = $unknownA * 2 in c + c
        // After partial eval, c gets inlined twice, then uninline() should extract it back
        const expr = letExpr(
          [[varExpr("c"), callExpr("*", [varExpr("unknownA"), valueExpr(2)])]],
          callExpr("+", [varExpr("c"), varExpr("c")]),
        );
        const result = evalPartial(env, expr);

        // Should be uninlined back to: let c = $unknownA * 2 in c + c
        expect(result.type).toBe("let");
        expect(printExpr(result)).toBe("let $c := $unknownA * 2 in $c + $c");
      });

      test("variable used once is not uninlined", () => {
        const env = createPartialEnv();
        // let c = $unknownA * 2 in c + 10
        const expr = letExpr(
          [[varExpr("c"), callExpr("*", [varExpr("unknownA"), valueExpr(2)])]],
          callExpr("+", [varExpr("c"), valueExpr(10)]),
        );
        const result = evalPartial(env, expr);

        // Should remain inlined: $unknownA * 2 + 10
        expect(result.type).toBe("call");
        expect(printExpr(result)).toBe("$unknownA * 2 + 10");
      });

      test("multiple variables uninlined correctly", () => {
        const env = createPartialEnv();
        // let a = $x * 2, b = $y + 1 in a + b + a + b
        const expr = letExpr(
          [
            [varExpr("a"), callExpr("*", [varExpr("x"), valueExpr(2)])],
            [varExpr("b"), callExpr("+", [varExpr("y"), valueExpr(1)])],
          ],
          callExpr("+", [
            callExpr("+", [
              callExpr("+", [varExpr("a"), varExpr("b")]),
              varExpr("a"),
            ]),
            varExpr("b"),
          ]),
        );
        const result = evalPartial(env, expr);

        // Both a and b should be uninlined
        expect(result.type).toBe("let");
        const printed = printExpr(result);
        expect(printed).toContain("$a := $x * 2");
        expect(printed).toContain("$b := $y + 1");
      });
    });

    describe("Complexity Threshold", () => {
      test("simple VarExpr is not uninlined even if used multiple times", () => {
        const env = createPartialEnv();
        // let c = $unknownA in c + c
        // VarExpr has complexity 0, should not be uninlined
        const expr = letExpr(
          [[varExpr("c"), varExpr("unknownA")]],
          callExpr("+", [varExpr("c"), varExpr("c")]),
        );
        const result = evalPartial(env, expr);

        // Should remain as: $unknownA + $unknownA (not uninlined)
        expect(result.type).toBe("call");
        expect(printExpr(result)).toBe("$unknownA + $unknownA");
      });

      test("simple ValueExpr is not uninlined even if used multiple times", () => {
        const env = createPartialEnv();
        // let c = 42 in $x + c + c
        // This fully evaluates to $x + 42 + 42 since 42 is concrete
        // But if c were symbolic and simple, it wouldn't be uninlined
        const expr = letExpr(
          [[varExpr("c"), valueExpr(42)]],
          callExpr("+", [
            callExpr("+", [varExpr("x"), varExpr("c")]),
            varExpr("c"),
          ]),
        );
        const result = evalPartial(env, expr);

        // 42 is concrete so it gets fully substituted
        expect(printExpr(result)).toBe("$x + 42 + 42");
      });

      test("PropertyExpr has complexity 1 - uninlined at default threshold", () => {
        const env = createPartialEnv();
        // let c = .prop in c + c
        // PropertyExpr has complexity 1, threshold is 1
        const expr = letExpr(
          [[varExpr("c"), propertyExpr("prop")]],
          callExpr("+", [varExpr("c"), varExpr("c")]),
        );
        const result = evalPartial(env, expr);

        // PropertyExpr complexity (1) >= threshold (1), should be uninlined
        expect(result.type).toBe("let");
        expect(printExpr(result)).toBe("let $c := prop in $c + $c");
      });

      test("CallExpr with args has sufficient complexity to be uninlined", () => {
        const env = createPartialEnv();
        // let c = ($x + 1) * 2 in c + c
        // Nested call has complexity 2: outer * (1) + inner + (1) = 2
        const expr = letExpr(
          [
            [
              varExpr("c"),
              callExpr("*", [
                callExpr("+", [varExpr("x"), valueExpr(1)]),
                valueExpr(2),
              ]),
            ],
          ],
          callExpr("+", [varExpr("c"), varExpr("c")]),
        );
        const result = evalPartial(env, expr);

        // Complexity: outer * (1) + inner + (1) + x (0) + 1 (0) + 2 (0) = 2
        expect(result.type).toBe("let");
        expect(printExpr(result)).toBe("let $c := ($x + 1) * 2 in $c + $c");
      });
    });

    describe("Variable Shadowing with Uninlining", () => {
      // Uninlining uses composite keys (scopeId:varName) to correctly
      // distinguish shadowed variables in different scopes.

      test("shadowed variables are correctly distinguished by scope", () => {
        const env = createPartialEnv();
        // let x = $a * 2 in (let x = 5 in x) + x + x
        // Inner x=5 (complexity 0, used once) - not uninlined
        // Outer x=$a*2 (complexity 1, used twice) - uninlined
        const expr = letExpr(
          [[varExpr("x"), callExpr("*", [varExpr("a"), valueExpr(2)])]],
          callExpr("+", [
            callExpr("+", [
              letExpr([[varExpr("x"), valueExpr(5)]], varExpr("x")),
              varExpr("x"),
            ]),
            varExpr("x"),
          ]),
        );
        const result = evalPartial(env, expr);

        // Outer x ($a*2) is used twice and has complexity 1, so it's uninlined
        // Inner x (5) has complexity 0, so it stays inlined
        const printed = printExpr(result);
        expect(printed).toBe("let $x := $a * 2 in 5 + $x + $x");
      });

      test("nested uninlining with different variable names", () => {
        const env = createPartialEnv();
        // let a = $x * 2 in let b = $y + 1 in a + b + a + b
        const expr = letExpr(
          [[varExpr("a"), callExpr("*", [varExpr("x"), valueExpr(2)])]],
          letExpr(
            [[varExpr("b"), callExpr("+", [varExpr("y"), valueExpr(1)])]],
            callExpr("+", [
              callExpr("+", [
                callExpr("+", [varExpr("a"), varExpr("b")]),
                varExpr("a"),
              ]),
              varExpr("b"),
            ]),
          ),
        );
        const result = evalPartial(env, expr);

        // Both a and b should be uninlined (different names, no ambiguity)
        expect(result.type).toBe("let");
        const printed = printExpr(result);
        expect(printed).toContain("$a := $x * 2");
        expect(printed).toContain("$b := $y + 1");
      });

      test("shadowed variable - each scope uninlined independently", () => {
        const env = createPartialEnv();
        // let x = $a * 2 in (let x = $b * 3 in x + x) + x
        // Inner x=$b*3 (complexity 1, used twice) - uninlined
        // Outer x=$a*2 (complexity 1, used once) - not uninlined
        const expr = letExpr(
          [[varExpr("x"), callExpr("*", [varExpr("a"), valueExpr(2)])]],
          callExpr("+", [
            letExpr(
              [[varExpr("x"), callExpr("*", [varExpr("b"), valueExpr(3)])]],
              callExpr("+", [varExpr("x"), varExpr("x")]),
            ),
            varExpr("x"),
          ]),
        );
        const result = evalPartial(env, expr);

        // Inner x ($b*3) is used twice - uninlined
        // Outer x ($a*2) is used once - stays inlined
        // Scope IDs correctly distinguish them
        expect(result.type).toBe("let");
        const printed = printExpr(result);
        expect(printed).toBe("let $x := $b * 3 in $x + $x + $a * 2");
      });

      test("let with partially known expression simplifies", () => {
        // let $x := 5 + 3, $y := $x + $unknown in $y
        // $x is fully known (8), so it gets inlined
        // $y is only used once, so it stays inlined (not wrapped in let)
        // Result: 8 + $unknown
        const env = createPartialEnv();
        const expr = letExpr(
          [
            [varExpr("x"), callExpr("+", [valueExpr(5), valueExpr(3)])],
            [varExpr("y"), callExpr("+", [varExpr("x"), varExpr("unknown")])],
          ],
          varExpr("y"),
        );
        const result = evalPartial(env, expr);
        expect(result.type).toBe("call");
        expect(printExpr(result)).toBe("8 + $unknown");
      });

      test.skip("shadowing with self-reference should return error not infinite loop", () => {
        // TODO: Implement circular reference detection - currently causes stack overflow
        // This test documents the desired behavior for self-referential bindings.
        // Currently both TypeScript and C# infinitely recurse on this expression.
        // The expected behavior is to detect the circular reference and return
        // a ValueExpr with null value and an error message.
        const env = createPartialEnv();
        const expr = letExpr(
          [[varExpr("x"), valueExpr(5)]],
          letExpr(
            [[varExpr("x"), callExpr("+", [varExpr("x"), valueExpr(3)])]],
            varExpr("x"),
          ),
        );
        const result = evalPartial(env, expr);

        // Should return null with an error about circular reference
        expect(result.type).toBe("value");
        expect((result as ValueExpr).value).toBeNull();
        expect((result as ValueExpr).errors).toBeDefined();
        expect((result as ValueExpr).errors?.length).toBeGreaterThan(0);
      });

      test.skip("direct self-reference should return error not infinite loop", () => {
        // TODO: Implement circular reference detection - currently causes stack overflow
        // Even simpler case: let $x := $x + 1 in $x
        // The binding directly references the variable being defined.
        const env = createPartialEnv();
        const expr = letExpr(
          [[varExpr("x"), callExpr("+", [varExpr("x"), valueExpr(1)])]],
          varExpr("x"),
        );
        const result = evalPartial(env, expr);

        // Should return null with an error about circular reference
        expect(result.type).toBe("value");
        expect((result as ValueExpr).value).toBeNull();
        expect((result as ValueExpr).errors).toBeDefined();
        expect((result as ValueExpr).errors?.length).toBeGreaterThan(0);
      });
    });
  });
});
