import { describe, test, expect } from "vitest";
import { newControl } from "@astroapps/controls";
import { reactiveEnv } from "../src/reactiveEvaluate";
import { ReactiveValueExprBase } from "../src/reactiveValueExpr";
import { parseEval } from "../src/parseEval";

describe("Reactive Environment", () => {
  describe("Basic arithmetic operations", () => {
    test("addition updates reactively", () => {
      const dataControl = newControl({ x: 10, y: 20 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("x + y");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(30);
      expect(ReactiveValueExprBase.isReactive(result)).toBe(true);

      // Update data
      dataControl.value = { x: 15, y: 25 };
      expect(result.value).toBe(40);
    });

    test("subtraction updates reactively", () => {
      const dataControl = newControl({ a: 100, b: 30 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("a - b");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(70);

      dataControl.value = { a: 50, b: 20 };
      expect(result.value).toBe(30);
    });

    test("multiplication updates reactively", () => {
      const dataControl = newControl({ x: 5, y: 6 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("x * y");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(30);

      dataControl.value = { x: 7, y: 8 };
      expect(result.value).toBe(56);
    });

    test("division updates reactively", () => {
      const dataControl = newControl({ x: 20, y: 4 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("x / y");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(5);

      dataControl.value = { x: 30, y: 6 };
      expect(result.value).toBe(5);
    });

    test("complex expression updates reactively", () => {
      const dataControl = newControl({ a: 10, b: 5, c: 2 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("(a + b) * c");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(30);

      dataControl.value = { a: 20, b: 10, c: 3 };
      expect(result.value).toBe(90);
    });
  });

  describe("Comparison operations", () => {
    test("equality updates reactively", () => {
      const dataControl = newControl({ x: 10, y: 10 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("x = y");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(true);

      dataControl.value = { x: 10, y: 20 };
      expect(result.value).toBe(false);
    });

    test("greater than updates reactively", () => {
      const dataControl = newControl({ a: 20, b: 10 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("a > b");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(true);

      dataControl.value = { a: 5, b: 10 };
      expect(result.value).toBe(false);
    });

    test("less than or equal updates reactively", () => {
      const dataControl = newControl({ x: 10, y: 20 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("x <= y");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(true);

      dataControl.value = { x: 30, y: 20 };
      expect(result.value).toBe(false);
    });
  });

  describe("Property access", () => {
    test("simple property access updates reactively", () => {
      const dataControl = newControl({ name: "Alice" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("name");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("Alice");
      expect(ReactiveValueExprBase.isReactive(result)).toBe(true);

      dataControl.value = { name: "Bob" };
      expect(result.value).toBe("Bob");
    });

    test("nested property access updates reactively", () => {
      const dataControl = newControl({ user: { name: "Alice", age: 30 } });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("user.name");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("Alice");

      dataControl.value = { user: { name: "Bob", age: 25 } };
      expect(result.value).toBe("Bob");
    });
  });

  describe("Array operations", () => {
    test("array property access updates reactively", () => {
      const dataControl = newControl({ nums: [1, 2, 3] });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("nums");
      const [_, result] = env.evaluate(expr);

      expect(ReactiveValueExprBase.isReactive(result)).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);

      dataControl.value = { nums: [4, 5, 6] };
      expect(Array.isArray(result.value)).toBe(true);
    });

    test("array element access updates reactively", () => {
      const dataControl = newControl({ items: [10, 20, 30] });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("items[1]");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(20);

      dataControl.value = { items: [100, 200, 300] };
      expect(result.value).toBe(200);
    });

    test("array length property updates reactively", () => {
      const dataControl = newControl({ nums: [1, 2, 3, 4] });
      const env = reactiveEnv(dataControl);

      // Direct array operations work
      const expr = parseEval("nums[0] + nums[1]");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(3); // 1 + 2

      dataControl.value = { nums: [10, 20, 30, 40] };
      expect(result.value).toBe(30); // 10 + 20
    });
  });

  describe("String operations", () => {
    test("string concatenation updates reactively", () => {
      const dataControl = newControl({ first: "Hello", second: "World" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("`{first} {second}`");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("Hello World");

      dataControl.value = { first: "Goodbye", second: "Universe" };
      expect(result.value).toBe("Goodbye Universe");
    });

    test("multiple string concatenations update reactively", () => {
      const dataControl = newControl({ a: "Hello", b: "Beautiful", c: "World" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("`{a} {b} {c}`");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("Hello Beautiful World");

      dataControl.value = { a: "Goodbye", b: "Cruel", c: "Universe" };
      expect(result.value).toBe("Goodbye Cruel Universe");
    });
  });

  describe("Conditional operations", () => {
    test("conditional expression evaluates correctly (initial value)", () => {
      const dataControl = newControl({ condition: true, a: 10, b: 20 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("condition ? a : b");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(10);
      expect(ReactiveValueExprBase.isReactive(result)).toBe(true);
    });

    test("conditional updates when selected branch value changes", () => {
      const dataControl = newControl({ flag: true, x: 100, y: 200 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("flag ? x : y");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(100);

      // Change the value in the active branch (flag is true, so x branch is active)
      dataControl.value = { flag: true, x: 300, y: 200 };
      expect(result.value).toBe(300);
    });
  });

  describe("Boolean operations", () => {
    test("AND operation evaluates correctly", () => {
      const dataControl = newControl({ a: true, b: true });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("a and b");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(true);
      expect(ReactiveValueExprBase.isReactive(result)).toBe(true);
    });

    test("OR operation evaluates correctly", () => {
      const dataControl = newControl({ a: false, b: true });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("a or b");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(true);
      expect(ReactiveValueExprBase.isReactive(result)).toBe(true);
    });

    test("NOT operation updates reactively", () => {
      const dataControl = newControl({ flag: true });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("!flag");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(false);

      dataControl.value = { flag: false };
      expect(result.value).toBe(true);
    });
  });

  describe("Null coalescing", () => {
    test("null coalescing evaluates correctly", () => {
      const dataControl = newControl({ value: null, default: "fallback" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("value ?? default");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("fallback");
      expect(ReactiveValueExprBase.isReactive(result)).toBe(true);
    });

    test("null coalescing updates when selected value changes", () => {
      const dataControl = newControl({ value: null, default: "fallback" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("value ?? default");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("fallback");

      // Update the active branch (default, since value is null)
      dataControl.value = { value: null, default: "new-fallback" };
      expect(result.value).toBe("new-fallback");
    });
  });

  describe("Complex reactive scenarios", () => {
    test("multiple operations update together", () => {
      const dataControl = newControl({ a: 10, b: 20, c: 5 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("(a + b) * c");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(150);

      // Update all values at once
      dataControl.value = { a: 5, b: 5, c: 10 };
      expect(result.value).toBe(100);
    });

    test("nested expressions with active branch updates", () => {
      const dataControl = newControl({ x: 10, y: 5, z: 2 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("x > y ? x * z : y * z");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(20); // 10 > 5, so 10 * 2

      // Update values in the active branch (x branch, since x > y)
      dataControl.value = { x: 10, y: 5, z: 3 };
      expect(result.value).toBe(30); // Still 10 > 5, but now 10 * 3
    });
  });

  describe("Reactivity isolation", () => {
    test("multiple evaluations are independent", () => {
      const dataControl = newControl({ x: 10, y: 20 });
      const env = reactiveEnv(dataControl);

      const expr1 = parseEval("x + y");
      const expr2 = parseEval("x * y");

      const [_, result1] = env.evaluate(expr1);
      const [__, result2] = env.evaluate(expr2);

      expect(result1.value).toBe(30);
      expect(result2.value).toBe(200);

      // Update control
      dataControl.value = { x: 5, y: 10 };

      // Both should update independently
      expect(result1.value).toBe(15);
      expect(result2.value).toBe(50);
    });
  });

  describe("Conditional re-evaluation", () => {
    test("conditional should re-evaluate when condition changes from true to false", () => {
      const dataControl = newControl({ flag: true, x: 100, y: 200 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("flag ? x : y");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(100); // flag is true, so x branch is active

      // Change the condition to false - should switch to y branch
      dataControl.value = { flag: false, x: 100, y: 200 };
      expect(result.value).toBe(200); // Switches to y branch
    });

    test("conditional should re-evaluate when comparison condition changes", () => {
      const dataControl = newControl({ a: 10, b: 5, x: 100, y: 200 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("a > b ? x : y");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(100); // 10 > 5, so x branch

      // Change comparison to make condition false
      dataControl.value = { a: 3, b: 5, x: 100, y: 200 };
      expect(result.value).toBe(200); // Condition changed to false, switches to y branch
    });

    test("nested conditionals should re-evaluate when outer condition changes", () => {
      const dataControl = newControl({
        outer: true,
        inner: true,
        a: 10,
        b: 20,
        c: 30
      });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("outer ? (inner ? a : b) : c");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(10); // outer=true, inner=true, so a

      // Change outer condition to false
      dataControl.value = { outer: false, inner: true, a: 10, b: 20, c: 30 };
      expect(result.value).toBe(30); // Outer changed to false, returns c
    });

    test("null coalescing should re-evaluate when value becomes non-null", () => {
      const dataControl = newControl({ value: null, default: "fallback" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("value ?? default");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("fallback"); // value is null, use default

      // Change value to non-null - should use value instead of default
      dataControl.value = { value: "actual", default: "fallback" };
      expect(result.value).toBe("actual"); // Uses actual value instead of fallback
    });

    test("AND operation should re-evaluate when left side becomes false", () => {
      const dataControl = newControl({ a: true, b: true, x: 10, y: 20 });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("a and b");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(true); // both true

      // Change left side to false
      dataControl.value = { a: false, b: true, x: 10, y: 20 };
      expect(result.value).toBe(false); // Short-circuits on false left side
    });

    test("OR operation should re-evaluate when both sides change", () => {
      const dataControl = newControl({ a: false, b: false });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("a or b");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(false); // both false

      // Change right side to true
      dataControl.value = { a: false, b: true };
      expect(result.value).toBe(true); // Re-evaluates and finds b is now true
    });
  });

  describe("Function re-evaluation", () => {
    test("$lower function should re-evaluate when input changes", () => {
      const dataControl = newControl({ text: "HELLO" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("$lower(text)");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("hello");

      // Change text value
      dataControl.value = { text: "WORLD" };
      expect(result.value).toBe("world"); // Re-evaluates with new input
    });

    test("$upper function should re-evaluate when input changes", () => {
      const dataControl = newControl({ text: "hello" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("$upper(text)");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("HELLO");

      // Change text value
      dataControl.value = { text: "world" };
      expect(result.value).toBe("WORLD"); // Re-evaluates with new input
    });

    test("$sum function should re-evaluate when array changes", () => {
      const dataControl = newControl({ numbers: [1, 2, 3, 4] });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("$sum(numbers)");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(10); // 1+2+3+4

      // Change array
      dataControl.value = { numbers: [5, 10, 15] };
      expect(result.value).toBe(30); // Re-evaluates with new array
    });

    test("$count function should re-evaluate when array changes", () => {
      const dataControl = newControl({ items: [1, 2, 3] });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("$count(items)");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe(3);

      // Change array length
      dataControl.value = { items: [1, 2, 3, 4, 5] };
      expect(result.value).toBe(5); // Re-evaluates with new array length
    });

    test("nested function calls should re-evaluate", () => {
      const dataControl = newControl({ text: "hello world" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("$upper($lower(text))");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("HELLO WORLD");

      // Change text
      dataControl.value = { text: "goodbye universe" };
      expect(result.value).toBe("GOODBYE UNIVERSE"); // Nested functions re-evaluate
    });

    test("function in conditional branch should re-evaluate", () => {
      const dataControl = newControl({ flag: true, text: "hello" });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("flag ? $upper(text) : $lower(text)");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("HELLO");

      // Change text value in active branch
      dataControl.value = { flag: true, text: "world" };
      expect(result.value).toBe("WORLD"); // Function in active branch re-evaluates
    });
  });

  describe("Dynamic key access", () => {
    test("object access with dynamic key from within object updates when key changes", () => {
      const dataControl = newControl({
        data: { name: "Alice", age: 30, city: "NYC", selectedField: "name" }
      });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("data[selectedField]");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("Alice");
      expect(ReactiveValueExprBase.isReactive(result)).toBe(true);

      // Change the key to access a different field
      dataControl.value = {
        data: { name: "Alice", age: 30, city: "NYC", selectedField: "age" }
      };
      expect(result.value).toBe(30); // Should reactively switch to age field

      // Change the key again
      dataControl.value = {
        data: { name: "Alice", age: 30, city: "NYC", selectedField: "city" }
      };
      expect(result.value).toBe("NYC"); // Should reactively switch to city field
    });

    test("object access with dynamic key updates when both key and value change", () => {
      const dataControl = newControl({
        user: { name: "Alice", age: 30, fieldToAccess: "name" }
      });
      const env = reactiveEnv(dataControl);

      const expr = parseEval("user[fieldToAccess]");
      const [_, result] = env.evaluate(expr);

      expect(result.value).toBe("Alice");

      // Change both the data and the key
      dataControl.value = {
        user: { name: "Bob", age: 25, fieldToAccess: "age" }
      };
      expect(result.value).toBe(25); // Should access the new age field
    });
  });
});
