import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { createEffect, groupedChanges, newControl } from "../src";

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
          (v, prev) => effectRuns.push(v),
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
          (v, prev) => effectRuns.push(v),
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
            (v, prev) => effectRuns.push(v),
          );
          list2.elements.forEach((x, i) => (x.as<any>().value = data2[i]));
          control.value = false;
          list1.elements.forEach((x, i) => (x.as<any>().value = undefined));
          expect(effectRuns).toStrictEqual([data1, data2]);
        },
      ),
    );
  });
});
