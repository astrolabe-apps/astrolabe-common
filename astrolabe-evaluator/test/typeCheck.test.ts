import { describe, expect, test } from "vitest";
import { defaultCheckEnv } from "../src/defaultFunctions";
import { parseEval } from "../src/parseEval";
import { typeCheck } from "../src/typeCheck";

const typeOf = (src: string) =>
  typeCheck(defaultCheckEnv, parseEval(src)).value;

describe("typeCheck", () => {
  test("unknown variable is any", () => {
    expect(typeOf("$nope")).toEqual({ type: "any" });
  });

  test.each([
    'let $a := $b, $b := "x" in $a',
    'let $b := "x", $a := $b in $a',
    'let $a := $c, $b := "x", $c := $b in $a',
  ])("let bindings are order independent: %s", (src) => {
    expect(typeOf(src)).toMatchObject({ type: "string", constant: "x" });
  });

  test("forward reference inside an expression", () => {
    expect(typeOf("let $a := $b + 1, $b := 2 in $a")).toMatchObject({
      type: "number",
    });
  });

  test.each([
    "let $a := $b, $b := $a in $a",
    "let $x := $x + 1 in $x",
    "let $a := $b, $b := $c, $c := $a in $a",
  ])("cycle is any rather than overflowing: %s", (src) => {
    expect(typeOf(src)).toMatchObject({ type: "any" });
  });

  test("bindings see outer scope", () => {
    expect(typeOf('let $a := "x" in let $b := $a in $b')).toMatchObject({
      type: "string",
    });
  });

  test("inner binding shadows outer", () => {
    expect(typeOf('let $a := "x" in let $a := 1 in $a')).toMatchObject({
      type: "number",
    });
  });
});
