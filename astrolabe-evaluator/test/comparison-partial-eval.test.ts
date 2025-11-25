import { describe, test, expect } from "vitest";
import { varExpr, callExpr, valueExpr } from "../src/ast";
import { printExpr } from "../src/printExpr";
import { partialEnv } from "../src/defaultFunctions";
import { evalPartial, evalResult } from "./testHelpers";

describe("Comparison Operators with Partial Evaluation", () => {
  test("equality with unknown variable should print correctly", () => {
    const env = partialEnv();
    const expr = callExpr("=", [varExpr("undefined"), valueExpr("string")]);
    const result = evalPartial(env, expr);

    // Should print as: $undefined = "string"
    // NOT as: $_($undefined, "string")
    expect(printExpr(result)).toBe('$undefined = "string"');
  });

  test("not-equals with unknown variable should print correctly", () => {
    const env = partialEnv();
    const expr = callExpr("!=", [varExpr("x"), valueExpr(5)]);
    const result = evalPartial(env, expr);

    expect(printExpr(result)).toBe("$x != 5");
  });

  test("less-than with unknown variable should print correctly", () => {
    const env = partialEnv();
    const expr = callExpr("<", [varExpr("y"), valueExpr(10)]);
    const result = evalPartial(env, expr);

    expect(printExpr(result)).toBe("$y < 10");
  });

  test("greater-than with unknown variable should print correctly", () => {
    const env = partialEnv();
    const expr = callExpr(">", [valueExpr(100), varExpr("z")]);
    const result = evalPartial(env, expr);

    expect(printExpr(result)).toBe("100 > $z");
  });

  test("less-than-or-equals with unknown variable should print correctly", () => {
    const env = partialEnv();
    const expr = callExpr("<=", [varExpr("a"), valueExpr(20)]);
    const result = evalPartial(env, expr);

    expect(printExpr(result)).toBe("$a <= 20");
  });

  test("greater-than-or-equals with unknown variable should print correctly", () => {
    const env = partialEnv();
    const expr = callExpr(">=", [valueExpr(50), varExpr("b")]);
    const result = evalPartial(env, expr);

    expect(printExpr(result)).toBe("50 >= $b");
  });
});
