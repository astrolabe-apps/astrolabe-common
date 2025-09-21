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

  it("async effect doesnt run twice and only queues a single effect", async () => {
    const control = newControl("initial");
    let concurrentCount = 0;
    let maxConcurrent = 0;
    let abortedCount = 0;
    const processResults: string[] = [];
    let callNumber = 0;

    const asyncEffect = new AsyncEffect<string>(async (effect, signal) => {
      const thisCall = ++callNumber;
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);

      const value = control.value;
      processResults.push(`call-${thisCall}: ${value}`);

      try {
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 50));

        if (signal.aborted) {
          abortedCount++;
        }

        return value;
      } finally {
        concurrentCount--;
      }
    });

    // Start first execution
    control.value = "first";
    asyncEffect.start();

    // While first is still running, trigger multiple runs
    await new Promise((resolve) => setTimeout(resolve, 10));

    control.value = "second";
    asyncEffect.runProcess(); // Should abort first, queue second

    control.value = "third";
    asyncEffect.runProcess(); // Should do nothing (second already queued)

    control.value = "fourth";
    asyncEffect.runProcess(); // Should do nothing (second already queued)

    // Wait for all to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify behavior
    expect(maxConcurrent).toBe(1); // Never more than 1 concurrent
    expect(abortedCount).toBe(1); // First execution was aborted
    expect(callNumber).toBe(2); // Only 2 executions total
    expect(processResults).toStrictEqual([
      "call-1: first",
      "call-2: fourth", // Second execution sees final value
    ]);

    asyncEffect.cleanup();
  });
});
