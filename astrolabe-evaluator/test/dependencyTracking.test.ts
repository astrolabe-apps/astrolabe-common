import { describe, expect, test } from "vitest";
import { basicEnv } from "../src/defaultFunctions";
import { valueExpr } from "../src/ast";
import { parseEval } from "../src/parseEval";
import type { ValueExpr, Path } from "../src/ast";

/**
 * Comprehensive tests for dependency tracking in the TypeScript evaluator.
 *
 * Key Concepts:
 * 1. Parameter Binding:
 *    - map(array, $x => ...) : $x is the element value
 *    - filter/first/any/all(array, $i => ...) : $i is the index, use $this() to access element
 *
 * 2. Lazy Dependency Model:
 *    - Array transformations (map, filter) preserve dependencies IN individual elements
 *    - Consumption functions (sum, first, elem) aggregate dependencies from accessed elements
 *
 * 3. Known Limitations:
 *    - LIMITATION: array[propertyExpr] fails - property lookup relative to elements, not global scope
 *      Workaround: Use $elem(array, variable) instead of array[variable]
 */

function pathToString(path: Path): string {
  const segments: (string | number)[] = [];
  let current: Path = path;
  while (current.segment !== null) {
    segments.unshift(current.segment);
    current = (current as any).parent;
  }
  return segments.map((x) => x.toString()).join(".");
}

function getDeps(result: ValueExpr): string[] {
  const paths: Path[] = [];
  if (result.path) paths.push(result.path);
  if (result.deps) paths.push(...result.deps);
  return paths
    .map((p) => pathToString(p))
    .sort()
    .filter((v, i, a) => i === 0 || v !== a[i - 1]); // distinct
}

describe("Parameter Binding Tests", () => {
  test("Map lambda variable is element value", () => {
    const data = { nums: [1, 2, 3] };
    const env = basicEnv(data);

    // Lambda variable $x should be the element value
    const expr = parseEval("$map(nums, $x => $x * 2)");
    const [_, result] = env.evaluate(expr);

    expect(Array.isArray(result.value)).toBe(true);
    const values = (result.value as ValueExpr[]).map((v) => v.value);
    expect(values).toEqual([2, 4, 6]);
  });

  test("Filter lambda variable is index, use $this for element", () => {
    const data = { nums: [10, 20, 30, 40, 50] };
    const env = basicEnv(data);

    // Lambda variable $i is the INDEX
    // Filter where index >= 2 should give [30, 40, 50]
    const exprByIndex = parseEval("nums[$i => $i >= 2]");
    const [_, resultByIndex] = env.evaluate(exprByIndex);

    expect(Array.isArray(resultByIndex.value)).toBe(true);
    const valuesByIndex = (resultByIndex.value as ValueExpr[]).map(
      (v) => v.value,
    );
    expect(valuesByIndex).toEqual([30, 40, 50]);

    // Use $this() to access the ELEMENT
    // Filter where element > 25 should give [30, 40, 50]
    const exprByElement = parseEval("nums[$i => $this() > 25]");
    const [_2, resultByElement] = env.evaluate(exprByElement);

    expect(Array.isArray(resultByElement.value)).toBe(true);
    const valuesByElement = (resultByElement.value as ValueExpr[]).map(
      (v) => v.value,
    );
    expect(valuesByElement).toEqual([30, 40, 50]);
  });

  test("First lambda variable is index, use $this for element", () => {
    const data = { items: ["a", "b", "c", "d"] };
    const env = basicEnv(data);

    // Lambda variable is index - find first where index >= 2 should give "c"
    const expr = parseEval("$first(items, $i => $i >= 2)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("c");
  });
});

describe("Lazy Dependency Model Tests", () => {
  test("Map preserves dependencies in individual elements", () => {
    const data = { nums: [1, 2, 3] };
    const env = basicEnv(data);

    const expr = parseEval("$map(nums, $x => $x * 2)");
    const [_, result] = env.evaluate(expr);

    expect(Array.isArray(result.value)).toBe(true);
    const elements = result.value as ValueExpr[];

    // The array itself should NOT have dependencies at the array level
    expect(result.deps).toBeUndefined();

    // But each ELEMENT should have dependencies
    for (let i = 0; i < elements.length; i++) {
      const deps = getDeps(elements[i]);
      expect(deps).toContain(`nums.${i}`);
    }
  });

  test("Filter preserves dependencies in filtered elements", () => {
    const data = { nums: [1, 2, 3, 4, 5] };
    const env = basicEnv(data);

    const expr = parseEval("nums[$i => $this() > 2]");
    const [_, result] = env.evaluate(expr);

    expect(Array.isArray(result.value)).toBe(true);
    const elements = result.value as ValueExpr[];

    expect(elements.length).toBe(3);

    // Each filtered element preserves its source dependency
    const allDeps = elements.flatMap((e) => getDeps(e)).filter((v, i, a) => i === 0 || v !== a[i - 1]);
    expect(allDeps).toContain("nums.2"); // element 3
    expect(allDeps).toContain("nums.3"); // element 4
    expect(allDeps).toContain("nums.4"); // element 5
  });
});

describe("Dependency Aggregation Tests", () => {
  test("Sum aggregates dependencies from all elements", () => {
    const data = { vals: [1, 2, 3] };
    const env = basicEnv(data);

    const expr = parseEval("$sum(vals)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(6);

    const deps = getDeps(result);
    expect(deps).toContain("vals.0");
    expect(deps).toContain("vals.1");
    expect(deps).toContain("vals.2");
  });

  test("Elem tracks only accessed element", () => {
    const data = { items: [10, 20, 30] };
    const env = basicEnv(data);

    const expr = parseEval("$elem(items, 1)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(20);

    const deps = getDeps(result);
    // Should ONLY track the accessed element
    expect(deps).toContain("items.1");
    expect(deps).not.toContain("items.0");
    expect(deps).not.toContain("items.2");
  });

  test("First tracks dependencies from evaluated elements", () => {
    const data = { items: [1, 5, 3, 8, 2] };
    const env = basicEnv(data);

    // Find first element > 4 (should be 5 at index 1)
    const expr = parseEval("$first(items, $i => $this() > 4)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(5);

    const deps = getDeps(result);
    // Should track elements evaluated up to and including the match
    expect(deps.some((d) => d.startsWith("items"))).toBe(true);
  });

  test("Elem with dynamic index tracks both element and index dependencies", () => {
    const data = { items: [10, 20, 30], indexVar: 1 };
    const env = basicEnv(data);

    // Dynamic index - should track both the element AND the index variable
    const expr = parseEval("$elem(items, indexVar)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(20);

    const deps = getDeps(result);
    // Should track the specific element accessed
    expect(deps).toContain("items.1");
    // Should ALSO track the index variable since it determines which element
    expect(deps).toContain("indexVar");
    // Should NOT track the whole array
    expect(deps).not.toContain("items");
  });

  test("Array access with dynamic index tracks both element and index dependencies", () => {
    const data = { items: [10, 20, 30], offset: 2 };
    const env = basicEnv(data);

    // Array access with dynamic index using let expression: let $idx := offset in items[$idx]
    const expr = parseEval("let $idx := offset in items[$idx]");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(30);

    const deps = getDeps(result);
    // Should track the specific element accessed
    expect(deps).toContain("items.2");
    // Should ALSO track the index variable since it determines which element
    expect(deps).toContain("offset");
    // Should NOT track the whole array
    expect(deps).not.toContain("items");
  });

  test("Array access with computed index tracks all dependencies", () => {
    const data = { values: [100, 200, 300, 400], baseIndex: 1, indexOffset: 1 };
    const env = basicEnv(data);

    // Array access with computed index using let expression: let $idx := baseIndex + indexOffset in values[$idx]
    // Should access values[2] = 300
    const expr = parseEval("let $idx := baseIndex + indexOffset in values[$idx]");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(300);

    const deps = getDeps(result);
    // Should track the specific element accessed
    expect(deps).toContain("values.2");
    // Should track both variables used in the index computation
    expect(deps).toContain("baseIndex");
    expect(deps).toContain("indexOffset");
    // Should NOT track the whole array
    expect(deps).not.toContain("values");
  });
});

describe("Pipeline Tests - Dependencies Flow Through Transformations", () => {
  test("Map then sum aggregates dependencies correctly", () => {
    const data = { values: [1, 2, 3] };
    const env = basicEnv(data);

    const expr = parseEval("$sum($map(values, $x => $x * 2))");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(12); // (1*2 + 2*2 + 3*2) = 12

    const deps = getDeps(result);
    // Sum should aggregate deps from all mapped elements
    expect(deps).toContain("values.0");
    expect(deps).toContain("values.1");
    expect(deps).toContain("values.2");
  });

  test("Filter then sum only tracks filtered elements", () => {
    const data = { scores: [50, 75, 90, 65, 85] };
    const env = basicEnv(data);

    // Filter scores >= 70 (keeps 75, 90, 85; filters out 50 and 65)
    const expr = parseEval("$sum(scores[$i => $this() >= 70])");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(250); // 75 + 90 + 85 = 250

    const deps = getDeps(result);
    // Should track only the filtered elements
    expect(deps).toContain("scores.1"); // 75
    expect(deps).toContain("scores.2"); // 90
    expect(deps).toContain("scores.4"); // 85
    // Should NOT have scores[0] (50) or scores[3] (65) - both filtered out
    expect(deps).not.toContain("scores.0");
    expect(deps).not.toContain("scores.3");
  });

  test("Map then elem only tracks accessed element", () => {
    const data = { items: [10, 20, 30] };
    const env = basicEnv(data);

    const expr = parseEval("$elem($map(items, $x => $x * 2), 1)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(40); // 20 * 2 = 40

    const deps = getDeps(result);
    // Precision: only track the ONE element accessed
    expect(deps).toContain("items.1");
    expect(deps).not.toContain("items.0");
    expect(deps).not.toContain("items.2");
  });
});

describe("Basic Operation Tests", () => {
  test("Arithmetic operations track dependencies", () => {
    const data = { a: 5, b: 10 };
    const env = basicEnv(data);

    const expr = parseEval("a + b");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(15);

    const deps = getDeps(result);
    expect(deps).toContain("a");
    expect(deps).toContain("b");
  });

  test("Comparison operations track dependencies", () => {
    const data = { x: 5, y: 10 };
    const env = basicEnv(data);

    const expr = parseEval("x < y");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(true);

    const deps = getDeps(result);
    expect(deps).toContain("x");
    expect(deps).toContain("y");
  });

  test("Boolean AND tracks dependencies from all evaluated args", () => {
    const data = { cond1: true, cond2: true };
    const env = basicEnv(data);

    const expr = parseEval("$and(cond1, cond2)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(true);

    const deps = getDeps(result);
    expect(deps).toContain("cond1");
    expect(deps).toContain("cond2");
  });

  test("Boolean AND short-circuits and tracks only evaluated", () => {
    const data = { cond1: false, cond2: true };
    const env = basicEnv(data);

    const expr = parseEval("$and(cond1, cond2)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(false);

    const deps = getDeps(result);
    // Short-circuited on cond1, so only it is tracked
    expect(deps).toContain("cond1");
  });
});

describe("Conditional Operator Tests", () => {
  test("Conditional should track only taken branch", () => {
    const data = { cond: true, thenVal: "A", elseVal: "B" };
    const env = basicEnv(data);

    const expr = parseEval("cond ? thenVal : elseVal");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("A");

    const deps = getDeps(result);
    // Should ONLY track the condition and the taken branch
    expect(deps).toContain("cond");
    expect(deps).toContain("thenVal");
    expect(deps).not.toContain("elseVal"); // Should NOT track the untaken branch
  });

  test("Conditional with complex condition should track only taken branch", () => {
    const data = { age: 25, minAge: 18, adult: "yes", minor: "no" };
    const env = basicEnv(data);

    const expr = parseEval("age >= minAge ? adult : minor");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("yes");

    const deps = getDeps(result);
    // Should track the condition parts
    expect(deps).toContain("age");
    expect(deps).toContain("minAge");
    // Should track the taken branch (adult)
    expect(deps).toContain("adult");
    expect(deps).not.toContain("minor"); // Should NOT track untaken branch
  });
});

describe("String Operations Tests", () => {
  test("String concatenation tracks dependencies", () => {
    const data = { first: "John", last: "Doe" };
    const env = basicEnv(data);

    const expr = parseEval('$string(first, " ", last)');
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("John Doe");

    const deps = getDeps(result);
    expect(deps).toContain("first");
    expect(deps).toContain("last");
  });

  test("Lower tracks dependencies", () => {
    const data = { name: "HELLO" };
    const env = basicEnv(data);

    const expr = parseEval("$lower(name)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("hello");

    const deps = getDeps(result);
    expect(deps).toContain("name");
  });
});

describe("Utility Functions Tests", () => {
  test("Null coalesce tracks dependencies from first non-null", () => {
    const data = { value: "exists" };
    const env = basicEnv(data);

    // nullField doesn't exist, so should use value
    const expr = parseEval("nullField ?? value");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("exists");

    const deps = getDeps(result);
    expect(deps).toContain("value");
  });

  test("Which tracks dependencies", () => {
    const data = {
      status: "pending",
      pendingMsg: "Please wait",
      activeMsg: "Active now",
    };
    const env = basicEnv(data);

    const expr = parseEval(
      '$which(status, "pending", pendingMsg, "active", activeMsg)',
    );
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("Please wait");

    const deps = getDeps(result);
    expect(deps).toContain("status");
    // Should track both the condition and the matched value expression
    expect(deps).toContain("pendingMsg");
  });
});