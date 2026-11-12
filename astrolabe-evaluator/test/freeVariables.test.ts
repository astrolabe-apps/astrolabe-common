import { describe, expect, test } from "vitest";
import { parseEval } from "../src/parseEval";
import { freeVariables } from "../src";

describe("freeVariables", () => {
  test.each([
    ["let $a := $b + 1, $b := $c in $a + $d", ["c", "d"]],
    ["let $b := 1, $a := $b in $a", []],
    ["items[$i => $i > $Max]", ["Max"]],
    ["$sum(axles.spacing) + $elem($X, 1)", ["X"]],
    ["`a {$T} b`", ["T"]],
    ["let $x := 1 in $x + $y", ["y"]],
    ['let $ROH := $Other in { "ROH": $ROH }', ["Other"]],
    ["let $x := $x + 1 in $x", []],
    ["let $a := let $b := $c in $b in $a + $b", ["b", "c"]],
  ])("%s", (src, expected) => {
    expect([...freeVariables(parseEval(src))].sort()).toEqual(expected);
  });

  test("respects bound parameter", () => {
    expect([...freeVariables(parseEval("$a + $b"), new Set(["a"]))]).toEqual([
      "b",
    ]);
  });
});
