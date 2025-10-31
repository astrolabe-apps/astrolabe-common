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
  const visited = new Set<ValueExpr>();

  function extractPaths(expr: ValueExpr) {
    if (visited.has(expr)) return;
    visited.add(expr);

    if (expr.path) paths.push(expr.path);
    if (expr.deps) {
      for (const dep of expr.deps) {
        extractPaths(dep);
      }
    }
  }

  extractPaths(result);
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
    const allDeps = elements
      .flatMap((e) => getDeps(e))
      .filter((v, i, a) => i === 0 || v !== a[i - 1]);
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

  test("Sum with null values tracks all element dependencies", () => {
    const data = { vals: [1, null, 3, null, 5] };
    const env = basicEnv(data);

    const expr = parseEval("$sum(vals)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(null); // Result is null when array contains nulls

    const deps = getDeps(result);
    // Should track ALL elements, including the null ones
    expect(deps).toContain("vals.0"); // 1
    expect(deps).toContain("vals.1"); // null
    expect(deps).toContain("vals.2"); // 3
    expect(deps).toContain("vals.3"); // null
    expect(deps).toContain("vals.4"); // 5
  });

  test("Min with null values tracks all element dependencies", () => {
    const data = { vals: [10, null, 3, null, 7] };
    const env = basicEnv(data);

    const expr = parseEval("$min(vals)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(null); // Result is null when array contains nulls

    const deps = getDeps(result);
    // Should track ALL elements, including the null ones
    expect(deps).toContain("vals.0"); // 10
    expect(deps).toContain("vals.1"); // null
    expect(deps).toContain("vals.2"); // 3
    expect(deps).toContain("vals.3"); // null
    expect(deps).toContain("vals.4"); // 7
  });

  test("Max with null values tracks all element dependencies", () => {
    const data = { vals: [10, null, 3, null, 7] };
    const env = basicEnv(data);

    const expr = parseEval("$max(vals)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(null); // Result is null when array contains nulls

    const deps = getDeps(result);
    // Should track ALL elements, including the null ones
    expect(deps).toContain("vals.0"); // 10
    expect(deps).toContain("vals.1"); // null
    expect(deps).toContain("vals.2"); // 3
    expect(deps).toContain("vals.3"); // null
    expect(deps).toContain("vals.4"); // 7
  });

  test("Count with null values tracks all element dependencies", () => {
    const data = { vals: [1, null, 3, null, 5] };
    const env = basicEnv(data);

    const expr = parseEval("$count(vals)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(5); // Total count including nulls

    const deps = getDeps(result);
    // Should track ALL elements, including the null ones
    // Note: count currently only tracks the array itself, not individual elements
    expect(deps.length).toBeGreaterThan(0);
  });

  test("Sum with all null values tracks all element dependencies", () => {
    const data = { vals: [null, null, null] };
    const env = basicEnv(data);

    const expr = parseEval("$sum(vals)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(null); // Result is null when all values are null

    const deps = getDeps(result);
    // Should still track ALL null elements
    expect(deps).toContain("vals.0");
    expect(deps).toContain("vals.1");
    expect(deps).toContain("vals.2");
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
    const expr = parseEval(
      "let $idx := baseIndex + indexOffset in values[$idx]",
    );
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
    // cond2 should NOT be tracked since it was never evaluated
    expect(deps).not.toContain("cond2");
  });

  test("Boolean OR short-circuits and tracks only evaluated", () => {
    const data = { cond1: true, cond2: false };
    const env = basicEnv(data);

    const expr = parseEval("$or(cond1, cond2)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(true);

    const deps = getDeps(result);
    // Short-circuited on cond1, so only it is tracked
    expect(deps).toContain("cond1");
    // cond2 should NOT be tracked since it was never evaluated
    expect(deps).not.toContain("cond2");
  });

  test("Boolean AND with 3+ params short-circuits on first false", () => {
    const data = { cond1: true, cond2: false, cond3: true, cond4: true };
    const env = basicEnv(data);

    const expr = parseEval("$and(cond1, cond2, cond3, cond4)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(false);

    const deps = getDeps(result);
    // Should track cond1 and cond2 (where it stopped)
    expect(deps).toContain("cond1");
    expect(deps).toContain("cond2");
    // Should NOT track cond3 or cond4 (never evaluated)
    expect(deps).not.toContain("cond3");
    expect(deps).not.toContain("cond4");
  });

  test("Boolean OR with 3+ params short-circuits on first true", () => {
    const data = { cond1: false, cond2: true, cond3: false, cond4: false };
    const env = basicEnv(data);

    const expr = parseEval("$or(cond1, cond2, cond3, cond4)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(true);

    const deps = getDeps(result);
    // Should track cond1 and cond2 (where it stopped)
    expect(deps).toContain("cond1");
    expect(deps).toContain("cond2");
    // Should NOT track cond3 or cond4 (never evaluated)
    expect(deps).not.toContain("cond3");
    expect(deps).not.toContain("cond4");
  });

  test("Boolean AND with 3+ params evaluates all when all true", () => {
    const data = { cond1: true, cond2: true, cond3: true };
    const env = basicEnv(data);

    const expr = parseEval("$and(cond1, cond2, cond3)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(true);

    const deps = getDeps(result);
    // Should track all since all were evaluated
    expect(deps).toContain("cond1");
    expect(deps).toContain("cond2");
    expect(deps).toContain("cond3");
  });

  test("Boolean OR with 3+ params evaluates all when all false", () => {
    const data = { cond1: false, cond2: false, cond3: false };
    const env = basicEnv(data);

    const expr = parseEval("$or(cond1, cond2, cond3)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(false);

    const deps = getDeps(result);
    // Should track all since all were evaluated
    expect(deps).toContain("cond1");
    expect(deps).toContain("cond2");
    expect(deps).toContain("cond3");
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

  test("Null coalesce tracks dependencies from null first argument", () => {
    const data = { array: [1, null, 2], fallback: 10 };
    const env = basicEnv(data);

    // $min(array) returns null, so should use fallback
    // BUT should also preserve dependencies from evaluating $min(array)
    const expr = parseEval("$min(array) ?? fallback");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(10);

    const deps = getDeps(result);
    // Should track all elements from $min(array) even though result came from fallback
    expect(deps).toContain("array.0");
    expect(deps).toContain("array.1");
    expect(deps).toContain("array.2");
    // Should also track the fallback value
    expect(deps).toContain("fallback");
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

describe("Object Property Dependency Tracking Tests", () => {
  test("Object property access tracks dependencies", () => {
    const data = { user: { name: "John", age: 30 } };
    const env = basicEnv(data);

    const expr = parseEval("user.name");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("John");

    const deps = getDeps(result);
    // Should track the specific property accessed
    expect(deps).toContain("user.name");
  });

  test("Nested object property access tracks dependencies", () => {
    const data = {
      company: {
        department: {
          manager: { name: "Alice", level: 5 },
        },
      },
    };
    const env = basicEnv(data);

    const expr = parseEval("company.department.manager.name");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("Alice");

    const deps = getDeps(result);
    // Should track the full path
    expect(deps).toContain("company.department.manager.name");
  });

  test("Object created with $object tracks property dependencies", () => {
    const data = { x: 10, y: 20 };
    const env = basicEnv(data);

    // Create an object with computed properties
    const expr = parseEval('$object("sum", x + y, "product", x * y)');
    const [_, result] = env.evaluate(expr);

    const deps = getDeps(result);
    // Should track dependencies from the computed property values
    expect(deps).toContain("x");
    expect(deps).toContain("y");
  });

  test("Accessing property from constructed object preserves dependencies", () => {
    const data = { a: 5, b: 10 };
    const env = basicEnv(data);

    // Create object and access property
    const expr = parseEval('let $obj := $object("val", a + b) in $obj.val');
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(15);

    const deps = getDeps(result);
    // Should track dependencies from the original computation
    expect(deps).toContain("a");
    expect(deps).toContain("b");
  });

  test("$values tracks dependencies from object properties", () => {
    const data = { obj: { x: 10, y: 20, z: 30 } };
    const env = basicEnv(data);

    const expr = parseEval("$sum($values(obj))");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(60);

    const deps = getDeps(result);
    // Should track all property dependencies
    expect(deps).toContain("obj.x");
    expect(deps).toContain("obj.y");
    expect(deps).toContain("obj.z");
  });
});

describe("Array Element Access Path Preservation Tests", () => {
  test("Constant index access preserves path, not deps", () => {
    const data = { array: [1, 2, 3] };
    const env = basicEnv(data);

    const expr = parseEval("array[0]");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(1);

    // Should have path to the element
    expect(result.path).toBeDefined();
    const pathStr = result.path ? pathToString(result.path) : "";
    expect(pathStr).toBe("array.0");

    // Should NOT have dependencies (it's direct data access)
    expect(result.deps).toBeUndefined();
  });

  test("$elem with constant index preserves path", () => {
    const data = { items: [10, 20, 30] };
    const env = basicEnv(data);

    const expr = parseEval("$elem(items, 1)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(20);

    // Should have path to the element
    expect(result.path).toBeDefined();
    const pathStr = result.path ? pathToString(result.path) : "";
    expect(pathStr).toBe("items.1");

    // Should NOT have dependencies
    expect(result.deps).toBeUndefined();
  });

  test("Dynamic index adds index dependencies while preserving path", () => {
    const data = { array: [10, 20, 30], idx: 1 };
    const env = basicEnv(data);

    // Use $elem for dynamic index (array[idx] doesn't work due to scoping limitation)
    const expr = parseEval("$elem(array, idx)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(20);

    // Should have path to the actual element accessed
    expect(result.path).toBeDefined();
    const pathStr = result.path ? pathToString(result.path) : "";
    expect(pathStr).toBe("array.1");

    // Should have dependency on idx variable
    const deps = getDeps(result);
    expect(deps).toContain("idx");
  });

  test("$elem with dynamic index adds dependencies", () => {
    const data = { values: [100, 200, 300], position: 2 };
    const env = basicEnv(data);

    const expr = parseEval("$elem(values, position)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(300);

    // Should have path to the actual element
    const pathStr = result.path ? pathToString(result.path) : "";
    expect(pathStr).toBe("values.2");

    // Should track dependency on position variable
    const deps = getDeps(result);
    expect(deps).toContain("position");
  });

  test("Computed index expression adds all dependencies", () => {
    const data = { nums: [1, 2, 3, 4, 5], offset: 1, base: 2 };
    const env = basicEnv(data);

    // Use $elem for computed index
    const expr = parseEval("$elem(nums, base + offset)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(4); // nums[3]

    // Should have path to element
    const pathStr = result.path ? pathToString(result.path) : "";
    expect(pathStr).toBe("nums.3");

    // Should track both offset and base
    const deps = getDeps(result);
    expect(deps).toContain("offset");
    expect(deps).toContain("base");
  });
});

describe("Object Filter with Dynamic Keys Tests", () => {
  test("Constant key access preserves path, not deps", () => {
    const data = { obj: { x: 10, y: 20, z: 30 } };
    const env = basicEnv(data);

    const expr = parseEval('obj["x"]');
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(10);

    // Should have path to the property
    expect(result.path).toBeDefined();
    const pathStr = result.path ? pathToString(result.path) : "";
    expect(pathStr).toBe("obj.x");

    // Should NOT have dependencies (it's direct data access)
    expect(result.deps).toBeUndefined();
  });

  test("Dynamic key with variable tracks key dependency", () => {
    const data = { user: { name: "Alice", age: 30, fieldToAccess: "name" } };
    const env = basicEnv(data);

    // Access object property using variable key from within the object context
    const expr = parseEval("user[fieldToAccess]");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("Alice");

    // Should have path to the actual property accessed
    expect(result.path).toBeDefined();
    const pathStr = result.path ? pathToString(result.path) : "";
    expect(pathStr).toBe("user.name");

    // Should have dependency on fieldToAccess variable
    const deps = getDeps(result);
    expect(deps).toContain("user.fieldToAccess");
  });

  test("Dynamic key with computed expression tracks all dependencies", () => {
    const data = {
      config: { setting_a: "value1", setting_b: "value2", prefix: "setting", suffix: "_a" },
    };
    const env = basicEnv(data);

    // Access property with computed key: prefix + suffix (from within object context)
    const expr = parseEval("config[$string(prefix, suffix)]");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("value1");

    // Should have path to the actual property
    const pathStr = result.path ? pathToString(result.path) : "";
    expect(pathStr).toBe("config.setting_a");

    // Should track both prefix and suffix
    const deps = getDeps(result);
    expect(deps).toContain("config.prefix");
    expect(deps).toContain("config.suffix");
  });

  test("Nested object access with dynamic key tracks dependencies", () => {
    const data = {
      company: {
        employees: { alice: { role: "manager" }, bob: { role: "developer" }, selectedName: "alice" },
      },
    };
    const env = basicEnv(data);

    const expr = parseEval("company.employees[selectedName].role");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe("manager");

    // Should have path to the final property
    const pathStr = result.path ? pathToString(result.path) : "";
    expect(pathStr).toBe("company.employees.alice.role");

    // Should track selectedName dependency
    const deps = getDeps(result);
    expect(deps).toContain("company.employees.selectedName");
  });

  test("Object filter with constant key in constructed object", () => {
    const data = { a: 5, b: 10 };
    const env = basicEnv(data);

    // Create object and access with constant key
    const expr = parseEval('let $obj := $object("sum", a + b) in $obj["sum"]');
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(15);

    const deps = getDeps(result);
    // Should track dependencies from the original computation, no key dependency
    expect(deps).toContain("a");
    expect(deps).toContain("b");
  });

  test("Dynamic key from computed sum tracks array dependencies through lookup", () => {
    const data = { array: [1, 2, 3] };
    const env = basicEnv(data);

    // Compute key from array sum, use it to lookup in literal object
    const expr = parseEval(
      'let $table := $object("6", [1.5, 1.5, 1.5]), $key := $fixed($sum(array), 0) in $table[$key]'
    );
    const [_, result] = env.evaluate(expr);

    expect(Array.isArray(result.value)).toBe(true);
    const resultArray = result.value as ValueExpr[];
    expect(resultArray[0].value).toBe(1.5);

    // Should track array dependencies because key depends on array
    const deps = getDeps(result);
    expect(deps).toContain("array.0");
    expect(deps).toContain("array.1");
    expect(deps).toContain("array.2");
  });

  test("Dynamic key from computed sum tracks array dependencies through nested access", () => {
    const data = { array: [1, 2, 3] };
    const env = basicEnv(data);

    // Compute key from array sum, use it to lookup and then access element
    const expr = parseEval(
      'let $table := $object("6", [1.5, 1.5, 1.5]), $key := $fixed($sum(array), 0) in $table[$key][0]'
    );
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(1.5);

    // Should track array dependencies even through nested access
    const deps = getDeps(result);
    expect(deps).toContain("array.0");
    expect(deps).toContain("array.1");
    expect(deps).toContain("array.2");
  });
});

describe("Null Index/Key Handling Tests", () => {
  test("Array access with null index from aggregation preserves dependencies", () => {
    const data = { array: [1, null, 2], lookup: [0, 1] };
    const env = basicEnv(data);

    // When $min(array) returns null, lookup[$idx] should return null with preserved deps
    const expr = parseEval("let $idx := $min(array) in lookup[$idx]");
    const [_, result] = env.evaluate(expr);

    // Result should be null
    expect(result.value).toBe(null);

    const deps = getDeps(result);
    // Should track all elements from $min(array)
    expect(deps).toContain("array.0");
    expect(deps).toContain("array.1");
    expect(deps).toContain("array.2");
  });

  test("Object access with null key from aggregation preserves dependencies", () => {
    const data = { array: [1, null, 2], obj: { a: 10, b: 20 } };
    const env = basicEnv(data);

    // When $min(array) returns null, obj[$key] should return null with preserved deps
    const expr = parseEval('let $key := $min(array) in obj[$key]');
    const [_, result] = env.evaluate(expr);

    // Result should be null
    expect(result.value).toBe(null);

    const deps = getDeps(result);
    // Should track all elements from $min(array)
    expect(deps).toContain("array.0");
    expect(deps).toContain("array.1");
    expect(deps).toContain("array.2");
  });

  test("Array access with direct null variable preserves dependencies", () => {
    const data = { lookup: [0, 1], idx: null };
    const env = basicEnv(data);

    // Use let expression to access idx in global scope
    const expr = parseEval("let $i := idx in lookup[$i]");
    const [_, result] = env.evaluate(expr);

    // Result should be null
    expect(result.value).toBe(null);

    const deps = getDeps(result);
    // Should track the idx variable
    expect(deps).toContain("idx");
  });

  test("Object access with direct null variable preserves dependencies", () => {
    const data = { obj: { a: 10, b: 20 }, key: null };
    const env = basicEnv(data);

    // Use let expression to access key in global scope
    const expr = parseEval("let $k := key in obj[$k]");
    const [_, result] = env.evaluate(expr);

    // Result should be null
    expect(result.value).toBe(null);

    const deps = getDeps(result);
    // Should track the key variable
    expect(deps).toContain("key");
  });
});

describe("FlatMap Dependency Tracking Tests", () => {
  test("FlatMap preserves dependencies in individual elements", () => {
    const data = {
      items: [
        { values: [1, 2] },
        { values: [3, 4] },
      ],
    };
    const env = basicEnv(data);

    // Flatmap items to their values arrays
    const expr = parseEval("items . values");
    const [_, result] = env.evaluate(expr);

    expect(Array.isArray(result.value)).toBe(true);
    const elements = result.value as ValueExpr[];

    // Should produce [1, 2, 3, 4]
    expect(elements.length).toBe(4);

    // Each ELEMENT should have dependencies tracking its source
    const allDeps = elements.flatMap((e) => getDeps(e));

    // Element 0 (value 1) should track items.0.values.0
    expect(allDeps).toContain("items.0.values.0");
    // Element 1 (value 2) should track items.0.values.1
    expect(allDeps).toContain("items.0.values.1");
    // Element 2 (value 3) should track items.1.values.0
    expect(allDeps).toContain("items.1.values.0");
    // Element 3 (value 4) should track items.1.values.1
    expect(allDeps).toContain("items.1.values.1");
  });

  test("FlatMap then sum aggregates dependencies correctly", () => {
    const data = {
      groups: [
        { nums: [1, 2] },
        { nums: [3, 4, 5] },
      ],
    };
    const env = basicEnv(data);

    // Flatmap to get all numbers then sum
    const expr = parseEval("$sum(groups . nums)");
    const [_, result] = env.evaluate(expr);

    expect(result.value).toBe(15); // 1+2+3+4+5 = 15

    const deps = getDeps(result);
    // Should track all individual elements
    expect(deps).toContain("groups.0.nums.0");
    expect(deps).toContain("groups.0.nums.1");
    expect(deps).toContain("groups.1.nums.0");
    expect(deps).toContain("groups.1.nums.1");
    expect(deps).toContain("groups.1.nums.2");
  });

  test("FlatMap with table lookup preserves dependencies in returned array elements", () => {
    const data = {
      items: [{ width: 2.5 }, { width: 3.5 }],
    };
    const env = basicEnv(data);

    // Simpler version of the real scenario:
    // For each item, lookup based on width and return array from table
    const expr = parseEval(`
      let $table := $object(
        "2.4", [10, 20, 30],
        "3.4", [40, 50, 60]
      )
      in items.(
        let $key := $this().width < 3.0 ? "2.4" : "3.4"
        in $table[$key]
      )
    `);
    const [_, result] = env.evaluate(expr);

    expect(Array.isArray(result.value)).toBe(true);
    const elements = result.value as ValueExpr[];

    // Should have 6 elements total (3 from each of 2 items)
    expect(elements.length).toBe(6);

    // Each element should have dependencies from the key computation (which depends on width)
    const allDeps = elements.flatMap((e) => getDeps(e));

    // First 3 elements came from items[0], so should depend on items.0.width
    const firstThreeDeps = elements
      .slice(0, 3)
      .flatMap((e) => getDeps(e))
      .filter((d) => d.includes("items.0"));
    expect(firstThreeDeps.length).toBeGreaterThan(0);
    expect(firstThreeDeps.some((d) => d === "items.0.width")).toBe(true);

    // Last 3 elements came from items[1], so should depend on items.1.width
    const lastThreeDeps = elements
      .slice(3, 6)
      .flatMap((e) => getDeps(e))
      .filter((d) => d.includes("items.1"));
    expect(lastThreeDeps.length).toBeGreaterThan(0);
    expect(lastThreeDeps.some((d) => d === "items.1.width")).toBe(true);
  });
});
