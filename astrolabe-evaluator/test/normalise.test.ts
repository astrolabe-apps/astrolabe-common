import fc from "fast-check";
import { parse, toNormalString } from "../src/normalString";
import {
  ArrayExpr,
  CallExpr,
  EvalExpr,
  LambdaExpr,
  LetExpr,
  ValueExpr,
  VarExpr,
} from "../src/ast";
import { expect, test } from "vitest";
import { Arbitrary } from "fast-check/lib/cjs/types/fast-check";

// Typescript port of NormaliseTest.cs and ExprGen.cs
const valueExprArb: fc.Arbitrary<ValueExpr> = fc.oneof(
  fc.constant({ type: "value", value: null }),
  fc.constant({ type: "value", value: false }),
  fc.constant({ type: "value", value: true }),
  fc.string({}).map((s) => ({ type: "value", value: s })),
  fc.option(fc.integer()).map((i) => ({ type: "value", value: i })),
  fc
    .option(fc.double().filter((d) => Number.isFinite(d)))
    .map((d) => ({ type: "value", value: d })),
) as Arbitrary<ValueExpr>;

const varExprArb: fc.Arbitrary<EvalExpr> = fc
  .string()
  .map((v) => ({ type: "var", variable: v }));

const propertyExprArb: fc.Arbitrary<EvalExpr> = fc
  .string()
  .map((p) => ({ type: "property", property: p }));

const letExprArb = (exprArb: fc.Arbitrary<EvalExpr>) =>
  fc
    .array(fc.tuple(varExprArb as fc.Arbitrary<VarExpr>, exprArb), {
      maxLength: 3,
    })
    .chain((vars) =>
      exprArb.map((expr) => ({ type: "let", variables: vars, expr })),
    ) as fc.Arbitrary<LetExpr>;

const callExprArb = (exprArb: fc.Arbitrary<EvalExpr>) =>
  fc
    .string()
    .chain((fn) =>
      fc
        .array(exprArb, { maxLength: 3 })
        .map((args) => ({ type: "call", function: fn, args })),
    ) as fc.Arbitrary<CallExpr>;

const arrayExprArb = (exprArb: fc.Arbitrary<EvalExpr>) =>
  fc
    .array(exprArb, { maxLength: 3 })
    .map((values) => ({ type: "array", values })) as fc.Arbitrary<ArrayExpr>;

const lambdaExprArb = (exprArb: fc.Arbitrary<EvalExpr>) =>
  fc
    .string()
    .chain((v) =>
      exprArb.map((expr) => ({ type: "lambda", variable: v, expr })),
    ) as fc.Arbitrary<LambdaExpr>;

const evalTermArb: fc.Arbitrary<EvalExpr> = fc.oneof(
  valueExprArb,
  varExprArb,
  propertyExprArb,
);

const { tree: evalExprArb } = fc.letrec((tie) => {
  const exprArb = tie("tree") as fc.Arbitrary<EvalExpr>;
  return {
    tree: fc.oneof(
      { depthSize: "xlarge", withCrossShrink: true },
      tie("leaf"),
      tie("node"),
    ) as fc.Arbitrary<EvalExpr>,
    node: fc.oneof(
      letExprArb(exprArb),
      callExprArb(exprArb),
      arrayExprArb(exprArb),
      lambdaExprArb(exprArb),
    ) as fc.Arbitrary<EvalExpr>,
    leaf: evalTermArb,
  };
});

test("NormaliseReflective", { timeout: 1000000 }, () => {
  fc.assert(
    fc.property(evalExprArb, (evalExpr) => {
      const reflected = JSON.stringify(parse(toNormalString(evalExpr)).result);
      const stringify = JSON.stringify(evalExpr);
      expect(stringify).toEqual(reflected);
    }),
    {
      // seed: -251769710,
      // path: "4:11:0:6:3:6:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:3:4:165",
      endOnFailure: true,
      verbose: true,
      numRuns: 1_000,
    },
  );
});
