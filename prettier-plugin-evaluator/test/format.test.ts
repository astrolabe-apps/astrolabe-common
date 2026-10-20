import { format } from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "../src/index.ts";

function fmt(source: string, printWidth = 80) {
  return format(source, {
    parser: "evaluator",
    plugins: [plugin],
    useTabs: true,
    printWidth,
  });
}

describe("short expressions", () => {
  it("normalises spacing around binary operators", async () => {
    expect(await fmt("$a+  1")).toBe("$a + 1\n");
  });
});

describe("one-line layout", () => {
  it.each<[string, string]>([
    ["$sum( $a , [1,2] )", "$sum($a, [1, 2])"],
    ['{"a":1,"b" : $x}', '{ "a": 1, "b": $x }'],
    ["{}", "{}"],
    ["[]", "[]"],
    ["$f()", "$f()"],
    ["items[ $i => $i>0 ] . name", "items[$i => $i > 0].name"],
    ["! $a", "!$a"],
    ["- 1", "-1"],
    ["$a?1:2", "$a ? 1 : 2"],
    ["let $a:=1, $b := 2 in $a", "let $a := 1, $b := 2 in $a"],
    ["`a{ $x+1 }b`", "`a{$x + 1}b`"],
    ["( $a and $b ) ?? false", "($a and $b) ?? false"],
    ["'single'", "'single'"],
    ['"esc\\"aped"', '"esc\\"aped"'],
    ["true", "true"],
    ["count(items)", "count(items)"],
  ])("%s", async (input, expected) => {
    expect(await fmt(input)).toBe(expected + "\n");
  });
});

describe("invalid input", () => {
  it.each(["$a +", "$f(1,", '{ "a" 1 }', "$a $b"])(
    "rejects %s",
    async (input) => {
      await expect(fmt(input)).rejects.toThrow(/Syntax error/);
    },
  );
});

describe("comments", () => {
  it("keeps a leading line comment on its own line", async () => {
    expect(await fmt("// header\n$a+1")).toBe("// header\n$a + 1\n");
  });

  it("keeps a trailing comment after the separator", async () => {
    expect(await fmt("let $a := 1, // one\n $b := 2 in $a")).toBe(
      "let\n\t$a := 1, // one\n\t$b := 2\nin $a\n",
    );
  });

  it("keeps an own-line comment before an argument", async () => {
    expect(await fmt("$f(1,\n// two\n2)")).toBe(
      "$f(\n\t1,\n\t// two\n\t2\n)\n",
    );
  });

  it("keeps own-line comments after the last field", async () => {
    expect(await fmt('{ "a": 1\n //"b": 2\n}')).toBe(
      '{\n\t"a": 1\n\t//"b": 2\n}\n',
    );
  });

  it("never puts code after a line comment", async () => {
    expect(await fmt("$f($a[$b\n// c\n], 1)")).toBe(
      "$f(\n\t$a[$b],\n\t// c\n\t1\n)\n",
    );
  });

  it("keeps an inline block comment", async () => {
    expect(await fmt("$a + /* b */ 1")).toBe("$a + /* b */ 1\n");
  });

  it("puts an own-line comment on a let body above its in", async () => {
    expect(await fmt("let $a := 1\n// c\nin $a")).toBe(
      "let\n\t$a := 1\n// c\nin $a\n",
    );
  });

  it("keeps an inline block comment on a let body after its in", async () => {
    expect(await fmt("let $a := 1 in /* c */ $a")).toBe(
      "let $a := 1 in /* c */ $a\n",
    );
  });

  it.each<[string, string]>([
    ['$which(\n// s\n$k, "a", 1)', '$which(\n\t// s\n\t$k,\n\t"a", 1\n)'],
    ["(\n// c\n$a)", "(\n\t// c\n\t$a\n)"],
    ["`a{\n// c\n$x}b`", "`a{\n\t// c\n\t$x\n}b`"],
  ])(
    "indents an own-line comment after an opening bracket: %s",
    async (input, expected) => {
      expect(await fmt(input)).toBe(expected + "\n");
    },
  );

  it("puts an own-line comment on a unary operand above the operator", async () => {
    expect(await fmt("! // c\n$a")).toBe("// c\n!$a\n");
  });

  it("lays out a unary head the same once its comment has moved", async () => {
    expect(await fmt("! // c\n$a and $b", 8)).toBe("// c\n!$a and\n\t$b\n");
  });

  it("keeps a comment between an operator and its operand", async () => {
    expect(await fmt("$a and // why\n$b")).toBe("$a and // why\n\t$b\n");
  });
});

describe("ternaries", () => {
  it("lays out a long chain flat, one condition per line", async () => {
    expect(
      await fmt('$a ? "one" : $b ? "two" : $c ? "three" : "none"', 30),
    ).toBe('$a\n\t? "one"\n\t: $b ? "two"\n\t: $c ? "three"\n\t: "none"\n');
  });

  it("brackets a ternary nested in the true branch", async () => {
    expect(await fmt("$a ? $b ? 1 : 2 : 3")).toBe("$a ? ($b ? 1 : 2) : 3\n");
  });

  it("puts a comment on a branch above its ? or :", async () => {
    expect(await fmt("$a ?\n// yes\n1 :\n// no\n2")).toBe(
      "$a\n\t// yes\n\t? 1\n\t// no\n\t: 2\n",
    );
  });

  it("nests a later link whose true branch has a comment", async () => {
    expect(await fmt("$a ? 1 : $b ?\n// why\n2 : 3")).toBe(
      "$a\n\t? 1\n\t: $b\n\t\t// why\n\t\t? 2\n\t\t: 3\n",
    );
  });

  // Lezer nests a long comment inside the condition's last operand.
  it.each(["why", "x".repeat(60)])(
    "keeps a comment after the condition above the ? (%s)",
    async (comment) => {
      expect(await fmt(`$a or $b > 1\n// ${comment}\n? 1 : 2`)).toBe(
        `$a or $b > 1\n\t// ${comment}\n\t? 1\n\t: 2\n`,
      );
    },
  );

  it("indents a chain under its assignment", async () => {
    expect(
      await fmt('let $x := $a ? "one" : $b ? "two" : "none" in $x', 30),
    ).toBe(
      'let\n\t$x := $a\n\t\t? "one"\n\t\t: $b ? "two"\n\t\t: "none"\nin $x\n',
    );
  });
});

describe("$which", () => {
  it("stays on one line when it fits", async () => {
    expect(await fmt('$which($k,"a",1)')).toBe('$which($k, "a", 1)\n');
  });

  it("puts one key/value pair per line when it breaks", async () => {
    expect(await fmt('$which($k, "a", 1, "b", 2, "c", 3)', 20)).toBe(
      '$which($k,\n\t"a", 1,\n\t"b", 2,\n\t"c", 3\n)\n',
    );
  });

  it("moves a commented value onto its own line", async () => {
    expect(await fmt('$which($k, "a",\n// why\n1)')).toBe(
      '$which($k,\n\t"a",\n\t\t// why\n\t\t1\n)\n',
    );
  });

  it("puts a trailing default on its own line", async () => {
    expect(await fmt('$which($k, "a", 1, 0)', 10)).toBe(
      '$which($k,\n\t"a", 1,\n\t0\n)\n',
    );
  });
});

describe("author's layout", () => {
  it("never breaks a call with one simple argument", async () => {
    expect(await fmt("$string($aVeryLongReferenceName)", 10)).toBe(
      "$string($aVeryLongReferenceName)\n",
    );
  });

  it("never breaks inside a template interpolation", async () => {
    const template = '`a{$x ? "long text here" : $f($y, [1, 2])}b`';
    expect(await fmt(template, 10)).toBe(template + "\n");
  });

  it("keeps an object expanded if it starts on a new line", async () => {
    expect(await fmt('{\n"a": 1}')).toBe('{\n\t"a": 1\n}\n');
  });

  it("keeps a $which broken if its first key starts on a new line", async () => {
    expect(await fmt('$which($k,\n"a", 1)')).toBe('$which($k,\n\t"a", 1\n)\n');
  });

  it("keeps one blank line between items", async () => {
    expect(await fmt("let\n$a := 1,\n\n\n$b := 2\nin $a")).toBe(
      "let\n\t$a := 1,\n\n\t$b := 2\nin $a\n",
    );
  });

  it("keeps one blank line between $which rows", async () => {
    expect(await fmt('$which($k,\n"a", 1,\n\n"b", 2)')).toBe(
      '$which($k,\n\t"a", 1,\n\n\t"b", 2\n)\n',
    );
  });
});

describe("operators after a multi-line operand", () => {
  it("keeps ?? on the operand's last line", async () => {
    expect(await fmt('$which($k,\n"a", 2\n) ?? [2, 4]')).toBe(
      '$which($k,\n\t"a", 2\n) ?? [2, 4]\n',
    );
  });

  it("keeps ?? on the operand's last line inside an object", async () => {
    expect(
      await fmt(
        '{\n"c": $c,\n"tyres": $which($c,\n"AllTerrainCrane", 2\n) ?? [2, 4]\n}',
      ),
    ).toBe(
      '{\n\t"c": $c,\n\t"tyres": $which($c,\n\t\t"AllTerrainCrane", 2\n\t) ?? [2, 4]\n}\n',
    );
  });

  it("keeps ?? on the last line of an operand broken for width", async () => {
    const expected = '$which($k,\n\t"a", 1,\n\t"b", 2\n) ?? 0\n';
    expect(await fmt('$which($k, "a", 1, "b", 2) ?? 0', 20)).toBe(expected);
    expect(await fmt(expected, 20)).toBe(expected);
  });

  it("still breaks a long chain of short operands", async () => {
    expect(await fmt("$aaaa ?? $bbbb ?? $cccc", 12)).toBe(
      "$aaaa ??\n\t$bbbb ??\n\t$cccc\n",
    );
  });
});

describe("deep nesting", () => {
  // Each level nests the last as the head of a different operator.
  it(
    "formats 22 alternating operator levels quickly",
    { timeout: 1000 },
    async () => {
      let source = "$a";
      for (let i = 0; i < 11; i++) source = `(${source} + 1) * 2`;
      expect(await fmt(source, 10000)).toBe(source + "\n");
    },
  );
});
