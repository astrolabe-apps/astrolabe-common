import { describe, expect, test } from "vitest";
import { basicEnv } from "../src/defaultFunctions";
import { parseEval } from "../src/parseEval";
import type { ValueExpr } from "../src/ast";
import { toNative } from "../src/ast";

/**
 * Comprehensive tests for all default functions in the TypeScript evaluator.
 * Tests the actual behavior and edge cases of each of the 37 default functions.
 */

function evalExpr(expr: string, data: unknown = {}): unknown {
  const env = basicEnv(data);
  const parsed = parseEval(expr);
  const [_, result] = env.evaluate(parsed);
  return result.value;
}

function evalExprNative(expr: string, data: unknown = {}): unknown {
  const env = basicEnv(data);
  const parsed = parseEval(expr);
  const [_, result] = env.evaluate(parsed);
  return toNative(result);
}

function evalToArray(expr: string, data: unknown = {}): unknown[] {
  const env = basicEnv(data);
  const parsed = parseEval(expr);
  const [_, result] = env.evaluate(parsed);
  const nativeResult = toNative(result);
  if (!Array.isArray(nativeResult)) {
    throw new Error("Expected array result");
  }
  return nativeResult as unknown[];
}

describe("Mathematical Operations", () => {
  test("Addition with integers", () => {
    const result = evalExpr("a + b", { a: 5, b: 3 });
    expect(result).toBe(8);
  });

  test("Addition with doubles", () => {
    const result = evalExpr("a + b", { a: 5.5, b: 3.2 });
    expect(result).toBeCloseTo(8.7, 5);
  });

  test("Addition with null returns null", () => {
    const result = evalExpr("a + b", { a: 5 });
    expect(result).toBeNull();
  });

  test("Subtraction with integers", () => {
    const result = evalExpr("a - b", { a: 10, b: 3 });
    expect(result).toBe(7);
  });

  test("Subtraction with doubles", () => {
    const result = evalExpr("a - b", { a: 10.5, b: 3.2 });
    expect(result).toBeCloseTo(7.3, 5);
  });

  test("Multiplication with integers", () => {
    const result = evalExpr("a * b", { a: 5, b: 3 });
    expect(result).toBe(15);
  });

  test("Multiplication with doubles", () => {
    const result = evalExpr("a * b", { a: 5.5, b: 2.0 });
    expect(result).toBeCloseTo(11.0, 5);
  });

  test("Division with integers", () => {
    const result = evalExpr("a / b", { a: 10, b: 4 });
    expect(result).toBe(2.5);
  });

  test("Division with doubles", () => {
    const result = evalExpr("a / b", { a: 10.0, b: 4.0 });
    expect(result).toBe(2.5);
  });

  test("Modulo with integers", () => {
    const result = evalExpr("a % b", { a: 10, b: 3 });
    expect(result).toBe(1);
  });

  test("Modulo with doubles", () => {
    const result = evalExpr("a % b", { a: 10.5, b: 3.0 });
    expect(result).toBeCloseTo(1.5, 5);
  });
});

describe("Comparison Operations", () => {
  test("Equality with equal numbers", () => {
    const result = evalExpr("a = b", { a: 5, b: 5 });
    expect(result).toBe(true);
  });

  test("Equality with different numbers", () => {
    const result = evalExpr("a = b", { a: 5, b: 3 });
    expect(result).toBe(false);
  });

  test("Equality with equal strings", () => {
    const result = evalExpr("a = b", { a: "hello", b: "hello" });
    expect(result).toBe(true);
  });

  test("Equality with booleans", () => {
    const result = evalExpr("a = b", { a: true, b: true });
    expect(result).toBe(true);
  });

  test("Equality with null returns null", () => {
    const result = evalExpr("a = b", { a: 5 });
    expect(result).toBeNull();
  });

  test("Not equal with different values", () => {
    const result = evalExpr("a != b", { a: 5, b: 3 });
    expect(result).toBe(true);
  });

  test("Not equal with equal values", () => {
    const result = evalExpr("a != b", { a: 5, b: 5 });
    expect(result).toBe(false);
  });

  test("Less than - true", () => {
    const result = evalExpr("a < b", { a: 3, b: 5 });
    expect(result).toBe(true);
  });

  test("Less than - false", () => {
    const result = evalExpr("a < b", { a: 5, b: 3 });
    expect(result).toBe(false);
  });

  test("Less than or equal with equal", () => {
    const result = evalExpr("a <= b", { a: 5, b: 5 });
    expect(result).toBe(true);
  });

  test("Less than or equal with less", () => {
    const result = evalExpr("a <= b", { a: 3, b: 5 });
    expect(result).toBe(true);
  });

  test("Greater than - true", () => {
    const result = evalExpr("a > b", { a: 10, b: 5 });
    expect(result).toBe(true);
  });

  test("Greater than - false", () => {
    const result = evalExpr("a > b", { a: 3, b: 5 });
    expect(result).toBe(false);
  });

  test("Greater than or equal with equal", () => {
    const result = evalExpr("a >= b", { a: 5, b: 5 });
    expect(result).toBe(true);
  });

  test("Greater than or equal with greater", () => {
    const result = evalExpr("a >= b", { a: 10, b: 5 });
    expect(result).toBe(true);
  });

  test("Comparison with strings", () => {
    const result = evalExpr("a < b", { a: "apple", b: "banana" });
    expect(result).toBe(true);
  });
});

describe("Logical Operations", () => {
  test("AND - both true", () => {
    const result = evalExpr("$and(a, b)", { a: true, b: true });
    expect(result).toBe(true);
  });

  test("AND - one false", () => {
    const result = evalExpr("$and(a, b)", { a: true, b: false });
    expect(result).toBe(false);
  });

  test("AND - both false", () => {
    const result = evalExpr("$and(a, b)", { a: false, b: false });
    expect(result).toBe(false);
  });

  test("AND - with null returns null", () => {
    const result = evalExpr("$and(a, b)", { a: true });
    expect(result).toBeNull();
  });

  test("AND - multiple values", () => {
    const result = evalExpr("$and(a, b, c)", { a: true, b: true, c: true });
    expect(result).toBe(true);
  });

  test("OR - both true", () => {
    const result = evalExpr("$or(a, b)", { a: true, b: true });
    expect(result).toBe(true);
  });

  test("OR - one true", () => {
    const result = evalExpr("$or(a, b)", { a: false, b: true });
    expect(result).toBe(true);
  });

  test("OR - both false", () => {
    const result = evalExpr("$or(a, b)", { a: false, b: false });
    expect(result).toBe(false);
  });

  test("OR - with null returns null", () => {
    const result = evalExpr("$or(a, b)", { a: false });
    expect(result).toBeNull();
  });

  test("NOT - with true", () => {
    const result = evalExpr("!a", { a: true });
    expect(result).toBe(false);
  });

  test("NOT - with false", () => {
    const result = evalExpr("!a", { a: false });
    expect(result).toBe(true);
  });

  test("NOT - with null returns null", () => {
    const result = evalExpr("!a", {});
    expect(result).toBeNull();
  });
});

describe("Conditional and Null Handling", () => {
  test("Conditional - true condition", () => {
    const result = evalExpr("cond ? a : b", { cond: true, a: "yes", b: "no" });
    expect(result).toBe("yes");
  });

  test("Conditional - false condition", () => {
    const result = evalExpr("cond ? a : b", { cond: false, a: "yes", b: "no" });
    expect(result).toBe("no");
  });

  test("Conditional - null condition returns null", () => {
    const result = evalExpr("cond ? a : b", { a: "yes", b: "no" });
    expect(result).toBeNull();
  });

  test("Conditional - with expressions", () => {
    const result = evalExpr("x > y ? x : y", { x: 10, y: 5 });
    expect(result).toBe(10);
  });

  test("Null coalesce - first is not null", () => {
    const result = evalExpr("a ?? b", { a: "value", b: "fallback" });
    expect(result).toBe("value");
  });

  test("Null coalesce - first is null", () => {
    const result = evalExpr("a ?? b", { b: "fallback" });
    expect(result).toBe("fallback");
  });

  test("Null coalesce - both null", () => {
    const result = evalExpr("a ?? b", {});
    expect(result).toBeNull();
  });

  test("Null coalesce - chained", () => {
    const result = evalExpr("a ?? b ?? c", { c: "third" });
    expect(result).toBe("third");
  });
});

describe("Array Aggregate Functions", () => {
  test("Sum with integers", () => {
    const result = evalExpr("$sum(nums)", { nums: [1, 2, 3, 4, 5] });
    expect(result).toBe(15);
  });

  test("Sum with doubles", () => {
    const result = evalExpr("$sum(nums)", { nums: [1.5, 2.5, 3.0] });
    expect(result).toBeCloseTo(7.0, 5);
  });

  test("Sum - empty array", () => {
    const result = evalExpr("$sum(nums)", { nums: [] });
    expect(result).toBe(0);
  });

  test("Sum - with direct values", () => {
    const result = evalExpr("$sum(1, 2, 3, 4)");
    expect(result).toBe(10);
  });

  test("Min with integers", () => {
    const result = evalExpr("$min(nums)", { nums: [5, 2, 8, 1, 9] });
    expect(result).toBe(1);
  });

  test("Min with doubles", () => {
    const result = evalExpr("$min(nums)", { nums: [5.5, 2.3, 8.7, 1.2] });
    expect(result).toBeCloseTo(1.2, 5);
  });

  test("Max with integers", () => {
    const result = evalExpr("$max(nums)", { nums: [5, 2, 8, 1, 9] });
    expect(result).toBe(9);
  });

  test("Max with doubles", () => {
    const result = evalExpr("$max(nums)", { nums: [5.5, 2.3, 8.7, 1.2] });
    expect(result).toBeCloseTo(8.7, 5);
  });

  test("Count with array", () => {
    const result = evalExpr("$count(items)", { items: [1, 2, 3, 4, 5] });
    expect(result).toBe(5);
  });

  test("Count - empty array", () => {
    const result = evalExpr("$count(items)", { items: [] });
    expect(result).toBe(0);
  });

  test("Count - with direct values", () => {
    const result = evalExpr("$count(1, 2, 3)");
    expect(result).toBe(3);
  });

  test("Any - with match", () => {
    const result = evalExpr("$any(nums, $i => $this() > 3)", {
      nums: [1, 2, 3, 4, 5],
    });
    expect(result).toBe(true);
  });

  test("Any - no match", () => {
    const result = evalExpr("$any(nums, $i => $this() > 10)", {
      nums: [1, 2, 3],
    });
    expect(result).toBe(false);
  });

  test("Any - empty array", () => {
    const result = evalExpr("$any(nums, $i => $this() > 0)", { nums: [] });
    expect(result).toBe(false);
  });

  test("All - all match", () => {
    const result = evalExpr("$all(nums, $i => $this() > 0)", {
      nums: [1, 2, 3, 4, 5],
    });
    expect(result).toBe(true);
  });

  test("All - some do not match", () => {
    const result = evalExpr("$all(nums, $i => $this() > 3)", {
      nums: [1, 2, 3, 4, 5],
    });
    expect(result).toBe(false);
  });

  test("All - empty array", () => {
    const result = evalExpr("$all(nums, $i => $this() > 0)", { nums: [] });
    expect(result).toBe(true);
  });

  test("Contains - with match", () => {
    const result = evalExpr("$contains(items, $i => 3)", { items: [1, 2, 3, 4, 5] });
    expect(result).toBe(true);
  });

  test("Contains - no match", () => {
    const result = evalExpr("$contains(items, $i => 10)", { items: [1, 2, 3, 4, 5] });
    expect(result).toBe(false);
  });

  test("Contains - with strings", () => {
    const result = evalExpr('$contains(items, $i => "banana")', {
      items: ["apple", "banana", "cherry"],
    });
    expect(result).toBe(true);
  });
});

describe("Array Access and Transform Functions", () => {
  test("Array - create from values", () => {
    const result = evalToArray("$array(1, 2, 3)");
    expect(result).toEqual([1, 2, 3]);
  });

  test("Array - flatten nested arrays", () => {
    const result = evalToArray("$array(arr)", { arr: [[1, 2], [3, 4]] });
    expect(result).toEqual([1, 2, 3, 4]);
  });

  test("Elem - valid index", () => {
    const result = evalExpr("$elem(items, 2)", { items: [10, 20, 30, 40] });
    expect(result).toBe(30);
  });

  test("Elem - first index", () => {
    const result = evalExpr("$elem(items, 0)", { items: [10, 20, 30] });
    expect(result).toBe(10);
  });

  test("Elem - last index", () => {
    const result = evalExpr("$elem(items, 2)", { items: [10, 20, 30] });
    expect(result).toBe(30);
  });

  test("Elem - out of bounds returns null", () => {
    const result = evalExpr("$elem(items, 5)", { items: [10, 20, 30] });
    expect(result).toBeNull();
  });

  test("First - finds match", () => {
    const result = evalExpr("$first(nums, $i => $this() > 4)", {
      nums: [1, 5, 3, 8, 2],
    });
    expect(result).toBe(5);
  });

  test("First - no match returns null", () => {
    const result = evalExpr("$first(nums, $i => $this() > 10)", {
      nums: [1, 2, 3],
    });
    expect(result).toBeNull();
  });

  test("FirstIndex - finds match", () => {
    const result = evalExpr("$firstIndex(nums, $i => $this() > 4)", {
      nums: [1, 5, 3, 8, 2],
    });
    expect(result).toBe(1);
  });

  test("FirstIndex - no match returns null", () => {
    const result = evalExpr("$firstIndex(nums, $i => $this() > 10)", {
      nums: [1, 2, 3],
    });
    expect(result).toBeNull();
  });

  test("IndexOf - finds value", () => {
    const result = evalExpr("$indexOf(items, $i => 30)", {
      items: [10, 20, 30, 40],
    });
    expect(result).toBe(2);
  });

  test("IndexOf - value not found returns null", () => {
    const result = evalExpr("$indexOf(items, $i => 99)", { items: [10, 20, 30] });
    expect(result).toBeNull();
  });

  test("Filter - with predicate", () => {
    const result = evalToArray("nums[$i => $this() > 3]", {
      nums: [1, 2, 3, 4, 5, 6],
    });
    expect(result).toEqual([4, 5, 6]);
  });

  test("Filter - no matches returns empty array", () => {
    const result = evalToArray("nums[$i => $this() > 10]", { nums: [1, 2, 3] });
    expect(result).toEqual([]);
  });

  test("Filter - with index access", () => {
    const result = evalToArray("nums[$i => $i >= 2]", {
      nums: [10, 20, 30, 40, 50],
    });
    expect(result).toEqual([30, 40, 50]);
  });
});

describe("Array Mapping Functions", () => {
  test("Map - transform values", () => {
    const result = evalToArray("$map(nums, $x => $x * 2)", { nums: [1, 2, 3, 4] });
    expect(result).toEqual([2, 4, 6, 8]);
  });

  test("Map - empty array", () => {
    const result = evalToArray("$map(nums, $x => $x * 2)", { nums: [] });
    expect(result).toEqual([]);
  });

  test("Map - with objects", () => {
    const result = evalToArray('$map(items, $x => $x["value"])', {
      items: [{ value: 10 }, { value: 20 }, { value: 30 }],
    });
    expect(result).toEqual([10, 20, 30]);
  });

  test("FlatMap - flatten arrays", () => {
    const result = evalToArray("items . values", {
      items: [{ values: [1, 2] }, { values: [3, 4] }],
    });
    expect(result).toEqual([1, 2, 3, 4]);
  });

  test("FlatMap - with empty results", () => {
    const result = evalToArray("items . values", {
      items: [{ values: [1, 2] }, { values: [] }, { values: [3] }],
    });
    expect(result).toEqual([1, 2, 3]);
  });
});

describe("String Functions", () => {
  test("String - concatenate values", () => {
    const result = evalExpr('$string(first, " ", last)', {
      first: "Hello",
      last: "World",
    });
    expect(result).toBe("Hello World");
  });

  test("String - convert number", () => {
    const result = evalExpr("$string(num)", { num: 42 });
    expect(result).toBe("42");
  });

  test("String - convert boolean", () => {
    const result = evalExpr("$string(flag)", { flag: true });
    expect(result).toBe("true");
  });

  test("String - convert null", () => {
    const result = evalExpr("$string(missing)", {});
    expect(result).toBe("null");
  });

  test("String - convert array", () => {
    const result = evalExpr("$string(items)", { items: [1, 2, 3] });
    expect(result).toBe("123");
  });

  test("Lower - convert to lowercase", () => {
    const result = evalExpr("$lower(text)", { text: "HELLO World" });
    expect(result).toBe("hello world");
  });

  test("Lower - already lowercase", () => {
    const result = evalExpr("$lower(text)", { text: "hello" });
    expect(result).toBe("hello");
  });

  test("Upper - convert to uppercase", () => {
    const result = evalExpr("$upper(text)", { text: "hello World" });
    expect(result).toBe("HELLO WORLD");
  });

  test("Upper - already uppercase", () => {
    const result = evalExpr("$upper(text)", { text: "HELLO" });
    expect(result).toBe("HELLO");
  });

  test("Fixed - format with two decimals", () => {
    const result = evalExpr("$fixed(num, 2)", { num: 3.14159 });
    expect(result).toBe("3.14");
  });

  test("Fixed - format with zero decimals", () => {
    const result = evalExpr("$fixed(num, 0)", { num: 3.14159 });
    expect(result).toBe("3");
  });

  test("Fixed - format integer", () => {
    const result = evalExpr("$fixed(num, 2)", { num: 42 });
    expect(result).toBe("42.00");
  });
});

describe("Object Functions", () => {
  test("Object - create from pairs", () => {
    const result = evalExprNative('$object("name", "John", "age", 30)');
    expect(result).toEqual({ name: "John", age: 30 });
  });

  test("Object - empty object", () => {
    const result = evalExprNative("$object()");
    expect(result).toEqual({});
  });

  test("Object - with various types", () => {
    const result = evalExprNative('$object("str", "hello", "num", 42, "bool", true)');
    expect(result).toEqual({ str: "hello", num: 42, bool: true });
  });

  test("Keys - get object keys", () => {
    const result = evalToArray("$keys(obj)", {
      obj: { name: "John", age: 30, city: "NYC" },
    });
    expect(result.sort()).toEqual(["age", "city", "name"]);
  });

  test("Keys - empty object", () => {
    const result = evalToArray("$keys(obj)", { obj: {} });
    expect(result).toEqual([]);
  });

  test("Values - get object values", () => {
    const result = evalToArray("$values(obj)", { obj: { a: 10, b: 20, c: 30 } });
    expect(result.sort()).toEqual([10, 20, 30]);
  });

  test("Values - empty object", () => {
    const result = evalToArray("$values(obj)", { obj: {} });
    expect(result).toEqual([]);
  });
});

describe("Control Flow and Utility Functions", () => {
  test("Which - matches first case", () => {
    const result = evalExpr('$which(status, "pending", msg1, "complete", msg2)', {
      status: "pending",
      msg1: "Waiting",
      msg2: "Done",
    });
    expect(result).toBe("Waiting");
  });

  test("Which - matches second case", () => {
    const result = evalExpr('$which(status, "pending", msg1, "complete", msg2)', {
      status: "complete",
      msg1: "Waiting",
      msg2: "Done",
    });
    expect(result).toBe("Done");
  });

  test("Which - no match returns null", () => {
    const result = evalExpr('$which(status, "pending", msg1, "complete", msg2)', {
      status: "unknown",
      msg1: "Waiting",
      msg2: "Done",
    });
    expect(result).toBeNull();
  });

  test("Which - with array of matches", () => {
    const result = evalExpr('$which(status, ["active", "running"], msg)', {
      status: "active",
      msg: "Running",
    });
    expect(result).toBe("Running");
  });

  test("This - in map context", () => {
    const result = evalToArray("$map(nums, $x => $this())", { nums: [1, 2, 3] });
    expect(result).toEqual([1, 2, 3]);
  });

  test("This - in filter context", () => {
    const result = evalToArray("nums[$i => $this() > 2]", { nums: [1, 2, 3, 4, 5] });
    expect(result).toEqual([3, 4, 5]);
  });

  test("NotEmpty - with non-empty string", () => {
    const result = evalExpr("$notEmpty(text)", { text: "hello" });
    expect(result).toBe(true);
  });

  test("NotEmpty - with empty string", () => {
    const result = evalExpr("$notEmpty(text)", { text: "" });
    expect(result).toBe(false);
  });

  test("NotEmpty - with null", () => {
    const result = evalExpr("$notEmpty(missing)", {});
    expect(result).toBe(false);
  });

  test("NotEmpty - with number", () => {
    const result = evalExpr("$notEmpty(num)", { num: 0 });
    expect(result).toBe(true);
  });

  test("NotEmpty - with boolean", () => {
    const result = evalExpr("$notEmpty(flag)", { flag: false });
    expect(result).toBe(true);
  });
});

describe("Let Expression Variable References", () => {
  test("Variable can reference another variable declared before it", () => {
    const result = evalExpr("let $x := 5, $y := $x + 10 in $y");
    expect(result).toBe(15);
  });

  test("Multiple chained variable references", () => {
    const result = evalExpr("let $a := 2, $b := $a * 3, $c := $b + 1 in $c");
    expect(result).toBe(7); // 2 * 3 + 1 = 7
  });

  test("Variable references with data access", () => {
    const result = evalExpr("let $x := value, $y := $x * 2 in $y", { value: 10 });
    expect(result).toBe(20);
  });

  test("Complex expression with variable references", () => {
    const result = evalExpr(
      "let $sum := a + b, $avg := $sum / 2, $result := $avg * multiplier in $result",
      { a: 10, b: 20, multiplier: 3 }
    );
    expect(result).toBe(45); // ((10 + 20) / 2) * 3 = 45
  });

  test("Variable reference in array context", () => {
    const result = evalToArray(
      "let $base := 5, $arr := $array($base, $base * 2, $base * 3) in $arr"
    );
    expect(result).toEqual([5, 10, 15]);
  });
});
