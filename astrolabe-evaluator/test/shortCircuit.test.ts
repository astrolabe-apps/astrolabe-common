import { describe, expect, test } from "vitest";
import { basicEnv } from "../src/defaultFunctions";
import { valueExpr } from "../src/ast";
import { parseEval } from "../src/parseEval";

describe("Short-circuit boolean operations", () => {
  test("AND short-circuits on false", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "and",
      args: [
        valueExpr(true),
        valueExpr(false),
        { type: "call", function: "invalid", args: [] }, // Would error if evaluated
      ],
    });

    expect(result.value).toBe(false);
    expect(resultEnv.errors).toHaveLength(0); // No errors means third arg not evaluated
  });

  test("AND short-circuits on null", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "and",
      args: [
        valueExpr(true),
        valueExpr(null),
        { type: "call", function: "invalid", args: [] }, // Would error if evaluated
      ],
    });

    expect(result.value).toBe(null);
    expect(resultEnv.errors).toHaveLength(0); // No errors means third arg not evaluated
  });

  test("AND evaluates all when all true", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "and",
      args: [valueExpr(true), valueExpr(true), valueExpr(true)],
    });

    expect(result.value).toBe(true);
  });

  test("OR short-circuits on true", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "or",
      args: [
        valueExpr(false),
        valueExpr(true),
        { type: "call", function: "invalid", args: [] }, // Would error if evaluated
      ],
    });

    expect(result.value).toBe(true);
    expect(resultEnv.errors).toHaveLength(0); // No errors means third arg not evaluated
  });

  test("OR evaluates all when all false", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "or",
      args: [valueExpr(false), valueExpr(false), valueExpr(false)],
    });

    expect(result.value).toBe(false);
  });

  test("OR returns true on first true", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "or",
      args: [
        valueExpr(true),
        { type: "call", function: "invalid", args: [] }, // Would error if evaluated
      ],
    });

    expect(result.value).toBe(true);
    expect(resultEnv.errors).toHaveLength(0);
  });

  test("AND returns false on first false", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "and",
      args: [
        valueExpr(false),
        { type: "call", function: "invalid", args: [] }, // Would error if evaluated
      ],
    });

    expect(result.value).toBe(false);
    expect(resultEnv.errors).toHaveLength(0);
  });

  test("AND with non-boolean returns null", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "and",
      args: [valueExpr(true), valueExpr("not a boolean")],
    });

    expect(result.value).toBe(null);
  });

  test("OR with non-boolean returns null", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "or",
      args: [valueExpr(false), valueExpr("not a boolean")],
    });

    expect(result.value).toBe(null);
  });

  test("AND single argument returns that value", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "and",
      args: [valueExpr(true)],
    });

    expect(result.value).toBe(true);
  });

  test("OR single argument returns that value", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "or",
      args: [valueExpr(true)],
    });

    expect(result.value).toBe(true);
  });

  test("AND with multiple true values", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "and",
      args: [valueExpr(true), valueExpr(true), valueExpr(true), valueExpr(true)],
    });

    expect(result.value).toBe(true);
  });

  test("OR with multiple false values", () => {
    const env = basicEnv(null);
    const [resultEnv, result] = env.evaluate({
      type: "call",
      function: "or",
      args: [
        valueExpr(false),
        valueExpr(false),
        valueExpr(false),
        valueExpr(false),
      ],
    });

    expect(result.value).toBe(false);
  });

  test("AND with parser syntax short-circuits on false", () => {
    const env = basicEnv(null);
    const expr = parseEval("$and(true, false, $invalid())");

    const [resultEnv, result] = env.evaluate(expr);

    expect(result.value).toBe(false);
    expect(resultEnv.errors).toHaveLength(0); // No errors means third arg not evaluated
  });

  test("OR with parser syntax short-circuits on true", () => {
    const env = basicEnv(null);
    const expr = parseEval("$or(false, true, $invalid())");

    const [resultEnv, result] = env.evaluate(expr);

    expect(result.value).toBe(true);
    expect(resultEnv.errors).toHaveLength(0); // No errors means third arg not evaluated
  });

  test("AND with parser syntax evaluates all when all true", () => {
    const env = basicEnv(null);
    const expr = parseEval("$and(true, true, true)");

    const [resultEnv, result] = env.evaluate(expr);

    expect(result.value).toBe(true);
  });

  test("OR with parser syntax evaluates all when all false", () => {
    const env = basicEnv(null);
    const expr = parseEval("$or(false, false, false)");

    const [resultEnv, result] = env.evaluate(expr);

    expect(result.value).toBe(false);
  });

  test("Complex expression with AND short-circuits", () => {
    const env = basicEnv(null);
    const expr = parseEval("$and(1 = 1, 2 > 3, $invalid())");

    const [resultEnv, result] = env.evaluate(expr);

    expect(result.value).toBe(false);
    expect(resultEnv.errors).toHaveLength(0);
  });

  test("Complex expression with OR short-circuits", () => {
    const env = basicEnv(null);
    const expr = parseEval("$or(1 = 2, 2 < 3, $invalid())");

    const [resultEnv, result] = env.evaluate(expr);

    expect(result.value).toBe(true);
    expect(resultEnv.errors).toHaveLength(0);
  });
});
