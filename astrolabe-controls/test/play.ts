import { createEffect, newControl } from "../src";
import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";

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
    },
  ),
);
