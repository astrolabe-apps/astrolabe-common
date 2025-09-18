import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  createEffect,
  groupedChanges,
  newControl,
  AsyncEffect,
  createCleanupScope,
} from "../src";

describe("effect", () => {
  it("effect runs for all change types", () => {
    fc.assert(
      fc.property(fc.string(), (v) => {
        const effectRuns: {
          value: string;
          disabled: boolean;
          touched: boolean;
          valid: boolean;
          error: string | null | undefined;
        }[] = [];
        const defaultValue = {
          value: v,
          disabled: false,
          touched: false,
          valid: true,
          error: null,
        };
        const ctrl = newControl(v);
        createEffect(
          () => {
            const { value, disabled, touched, valid, error } = ctrl;
            return { value, disabled, touched, valid, error };
          },
          (v) => effectRuns.push(v),
        );
        ctrl.value = v + "a";
        ctrl.disabled = true;
        ctrl.touched = true;
        ctrl.error = "BAD";
        groupedChanges(() => {
          ctrl.clearErrors();
          ctrl.touched = false;
          ctrl.disabled = false;
          ctrl.value = v;
        });
        expect(effectRuns).toStrictEqual([
          defaultValue,
          { ...defaultValue, value: v + "a" },
          { ...defaultValue, value: v + "a", disabled: true },
          { ...defaultValue, value: v + "a", disabled: true, touched: true },
          {
            ...defaultValue,
            value: v + "a",
            disabled: true,
            touched: true,
            error: "BAD",
            valid: false,
          },
          defaultValue,
        ]);
      }),
    );
  });

  it("effect captures changes in multiple controls", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (v, v2) => {
        const effectRuns: {
          value: string;
          value2: string;
        }[] = [];
        const ctrl = newControl(v);
        const ctrl2 = newControl(v2);
        createEffect(
          () => {
            const { value } = ctrl;
            const { value: value2 } = ctrl2;
            return { value, value2 };
          },
          (v) => effectRuns.push(v),
        );
        ctrl.value = v + "a";
        ctrl2.value = v2 + "b";
        groupedChanges(() => {
          ctrl.value = v;
          ctrl2.value = v2;
        });
        expect(effectRuns).toStrictEqual([
          { value: v, value2: v2 },
          { value: v + "a", value2: v2 },
          { value: v + "a", value2: v2 + "b" },
          { value: v, value2: v2 },
        ]);
      }),
    );
  });

  it("subscriptions are updated when control not used", () => {
    fc.assert(
      fc.property(
        fc.array(fc.jsonValue(), { minLength: 1 }),
        fc.array(fc.jsonValue(), { minLength: 1 }),
        (data1, data2) => {
          const effectRuns: any[] = [];
          const control = newControl(true);
          const list1 = newControl(data1);
          const list2 = newControl(data2.map((x) => null));
          const effect = createEffect(
            () => (control.value ? list1 : list2).elements.map((x) => x.value),
            (v) => effectRuns.push(v),
          );
          list2.elements.forEach((x, i) => (x.as<any>().value = data2[i]));
          control.value = false;
          list1.elements.forEach((x, i) => (x.as<any>().value = undefined));
          expect(effectRuns).toStrictEqual([data1, data2]);
        },
      ),
    );
  });

  it("subscriptions are removed on cleanup", () => {
    fc.assert(
      fc.property(fc.string(), (v) => {
        const control = newControl(v);
        const effectRuns: string[] = [];
        const effect = createEffect(
          () => control.value,
          (v) => effectRuns.push(v),
        );
        control.value = v + "a";
        effect.cleanup();
        control.value = v + "b";
        expect(effectRuns).toStrictEqual([v, v + "a"]);
      }),
    );
  });

  it("async effect process function is not called twice", async () => {
    const control = newControl("initial");
    const processCallCount = { count: 0 };
    const processResults: string[] = [];
    const cleanupScope = createCleanupScope();

    const asyncEffect = new AsyncEffect<string>(async (effect, signal) => {
      processCallCount.count++;
      const value = control.value;
      processResults.push(value);

      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 10));

      if (signal.aborted) {
        throw new Error("Aborted");
      }

      return value;
    });

    cleanupScope.addCleanup(() => asyncEffect.cleanup());

    // This reproduces the race condition:
    // 1. Change control value which triggers the subscription callback
    control.value = "changed";

    // 2. Before the async callback executes, call start()
    // This should NOT cause double execution
    asyncEffect.start();

    // Wait for all promises to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The process function should only be called once, not twice
    expect(processCallCount.count).toBe(1);
    expect(processResults).toStrictEqual(["changed"]);

    cleanupScope.cleanup();
  });

  it("async effect handles race condition between subscription and start", async () => {
    const control = newControl("initial");
    let processCallCount = 0;
    const processResults: string[] = [];

    const asyncEffect = new AsyncEffect<string>(async (effect, signal) => {
      processCallCount++;
      if (processCallCount > 1) throw new Error("Concurrent");
      const value = control.value;
      processResults.push(`call-${processCallCount}: ${value}`);

      // Simulate real async work
      await new Promise((resolve) => setTimeout(resolve, 10));

      // if (signal.aborted) {
      //   throw new Error("Aborted");
      // }
      processCallCount--;
      return value;
    });

    // Simulate the problematic sequence:
    // 1. Control changes, triggering subscription
    control.value = "test-value";

    // 2. Start is called immediately (race condition scenario)
    asyncEffect.start();

    // 3. Another change before first completes
    await new Promise((resolve) => setTimeout(resolve, 50));
    control.value = "second-value";
    // await new Promise((resolve) => setTimeout(resolve, 10));
    control.value = "third-value";
    await new Promise((resolve) => setTimeout(resolve, 10));
    // control.value = "fourth-value";

    // Wait for all async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Should have exactly 2 calls: one for "test-value" and one for "second-value"
    // NOT 3 calls (which would indicate the race condition bug)
    expect(processResults).toStrictEqual([
      "call-1: test-value",
      "call-1: third-value",
    ]);

    asyncEffect.cleanup();
  });

  it("demonstrates the currentPromise undefined bug", async () => {
    const control = newControl("initial");
    let processCallCount = 0;

    const asyncEffect = new AsyncEffect<string>(async (effect, signal) => {
      processCallCount++;
      const value = control.value;

      // Short delay to make timing issues more apparent
      await new Promise((resolve) => setTimeout(resolve, 1));

      if (signal.aborted) {
        throw new Error("Aborted");
      }

      return value;
    });

    // The bug: currentPromise is undefined in constructor
    // When a change occurs before start() is called,
    // the callback awaits undefined which resolves immediately
    control.value = "trigger-change";

    // This should trigger the race condition where:
    // 1. The change callback immediately runs due to undefined currentPromise
    // 2. start() creates another promise
    asyncEffect.start();

    // Let async operations complete
    await new Promise((resolve) => setTimeout(resolve, 20));

    // With the current bug, this might be called more than once
    // The test should fail initially, then pass after the fix
    expect(processCallCount).toBe(1);

    asyncEffect.cleanup();
  });
});
