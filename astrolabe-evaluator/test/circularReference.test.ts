import { describe, expect, test } from "vitest";
import { basicEnv, partialEnv } from "../src/defaultFunctions";
import { parseEval } from "../src/parseEval";
import {
  callExpr,
  checkValue,
  primitiveType,
  ValueExpr,
  varExpr,
} from "../src/ast";
import { evalResult, evalWithErrors } from "./testHelpers";

const cycles = [
  "let $a := $b, $b := $a in $a",
  "let $x := $x + 1 in $x",
  "let $a := $b, $b := $c, $c := $a in $a",
  "let $x := $x in $x",
  "let $x := 5 in let $x := $x + 3 in $x",
];

describe("circular references", () => {
  test.each(cycles)("basic env: %s", (src) => {
    const { result, errors } = evalWithErrors(basicEnv({}), parseEval(src));
    expect(result.value).toBeNull();
    expect(errors.some((e) => e.includes("Circular reference"))).toBe(true);
  });

  test.each(cycles)("partial env: %s", (src) => {
    const { result, errors } = evalWithErrors(partialEnv(), parseEval(src));
    expect(result.value).toBeNull();
    expect(errors.some((e) => e.includes("Circular reference"))).toBe(true);
  });

  test("error names the variable", () => {
    const { errors } = evalWithErrors(
      basicEnv({}),
      parseEval("let $x := $x + 1 in $x"),
    );
    expect(errors).toContain("Circular reference to $x");
  });

  test.each([
    ["let $a := $b + 1, $b := 2 in $a", 3],
    ["let $a := $b + $b, $b := 2 in $a", 4],
    ["let $a := $b + $c, $b := $c, $c := 1 in $a", 2],
  ])("forward references still evaluate: %s", (src, expected) => {
    expect(evalResult(basicEnv({}), parseEval(src)).value).toBe(expected);
    expect(evalResult(partialEnv(), parseEval(src)).value).toBe(expected);
  });

  const boom: ValueExpr = {
    type: "value",
    function: {
      eval: () => {
        throw new Error("boom");
      },
      getType: (env) => checkValue(env, primitiveType("any")),
    },
  };

  test.each([
    ["basic", () => basicEnv({})],
    ["partial", () => partialEnv()],
  ])(
    "%s env: exception during binding does not leave a false cycle",
    (_, mkEnv) => {
      const env = mkEnv().newScope({ boom, a: callExpr("boom", []) });
      expect(() => env.evaluateExpr(varExpr("a"))).toThrow("boom");
      // A retry must recompute rather than report a circular reference
      expect(() => env.evaluateExpr(varExpr("a"))).toThrow("boom");
    },
  );
});
