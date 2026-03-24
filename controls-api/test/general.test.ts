import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { Control, ControlChange } from "../src/lib/types";
import { lookupControl, getControlPath } from "../src/lib/controlUtils";
import { computed } from "../src/lib/computed";
import { deepEquals } from "../src/lib/deepEquals";
import { makeCtx, expectChanges } from "./index";
import { arbitraryParentChild } from "./gen";

describe("general", () => {
  it("dirty flag for value", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const f = ctx.newControl(text);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        ctx.update((wc) => wc.setValue(f, text + "a"));
        expect(changes).toStrictEqual([ControlChange.Value]);
        return f.dirtyNow;
      }),
    );
  });

  it("only get changes after subscription", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const changes2: ControlChange[] = [];
        const f = ctx.newControl(text);
        f.subscribe(
          (a, c) => changes.push(c),
          ControlChange.Value | ControlChange.Dirty,
        );
        ctx.update((wc) => wc.setValue(f, text + "a"));
        f.subscribe((a, c) => changes2.push(c), ControlChange.Value);
        ctx.update((wc) => wc.setValue(f, text + "b"));
        expect(changes).toStrictEqual([
          ControlChange.Value | ControlChange.Dirty,
          ControlChange.Value,
        ]);
        expect(changes2).toStrictEqual([ControlChange.Value]);
        return f.dirtyNow;
      }),
    );
  });

  it("dont get changes after unsubscribe", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const f = ctx.newControl(text);
        const sub1 = f.subscribe(
          (a, c) => changes.push(c),
          ControlChange.Value,
        );
        ctx.update((wc) => wc.setValue(f, text + "a"));
        f.unsubscribe(sub1);
        ctx.update((wc) => wc.setValue(f, text + "b"));
        expect(changes).toStrictEqual([ControlChange.Value]);
      }),
    );
  });

  it("can lookup arbitrary child", () => {
    fc.assert(
      fc.property(arbitraryParentChild, (json) => {
        const ctx = makeCtx();
        const parent = ctx.newControl(json.json);
        const child = lookupControl(parent, json.child);
        return child != null;
      }),
    );
  });

  it("check that arbitrary child path can be returned by getControlPath", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.string(), fc.integer({ min: 0, max: 2 }))),
        (path) => {
          const ctx = makeCtx();
          const actualPath = ["first", ...path];
          let base: Control<any> = ctx.newControl({});
          let index = 0;
          while (index < actualPath.length && base) {
            const childId = actualPath[index];
            if (typeof childId === "string") {
              base = base.fields[childId];
            } else {
              ctx.update((wc) =>
                wc.setValue(base, Array.from({ length: childId + 1 })),
              );
              base = base.elements[childId];
            }
            index++;
          }
          const controlPath = getControlPath(base);
          expect(controlPath).toEqual(actualPath);
        },
      ),
    );
  });

  it("getControlPath works with __proto__ as field key", () => {
    const ctx = makeCtx();
    const root = ctx.newControl<any>({});
    const first = root.fields["first"];
    const proto = first.fields["__proto__"];
    ctx.update((wc) => wc.setValue(proto, [1]));
    ctx.update((wc) => wc.setValue(proto, [1]));
    const elem = proto.elements[0];
    expect(getControlPath(proto)).toEqual(["first", "__proto__"]);
    expect(getControlPath(elem)).toEqual(["first", "__proto__", 0]);
  });

  it("can set computation", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.array(fc.integer()),
        (numbers1, numbers2) => {
          const ctx = makeCtx();
          const changes: ControlChange[] = [];
          const numberControls = ctx.newControl(numbers1);
          const resultControl = ctx.newControl(-1);
          resultControl.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value,
          );
          let sumCalled = 0;
          const sum = (rc: any) => {
            sumCalled++;
            return rc
              .getElements(numberControls)
              .reduce((a: number, b: any) => a + rc.getValue(b), 0);
          };
          const max = (rc: any) =>
            rc
              .getElements(numberControls)
              .reduce((a: number, b: any) => Math.max(a, rc.getValue(b)), 0);
          const ref = computed(ctx, resultControl, sum);
          // Same function — replaceCompute should no-op
          ref.replaceCompute(sum);
          expect(sumCalled).toBe(1);
          expectChanges(changes, [ControlChange.Value]);
          expect(resultControl.valueNow).toStrictEqual(
            numbers1.reduce((a, b) => a + b, 0),
          );
          ctx.update((wc) => wc.setValue(numberControls, numbers2));
          expectChanges(
            changes,
            deepEquals(numbers1, numbers2) ? [] : [ControlChange.Value],
          );
          expect(resultControl.valueNow).toStrictEqual(
            numbers2.reduce((a, b) => a + b, 0),
          );
          ref.replaceCompute(max);
          expect(resultControl.valueNow).toStrictEqual(
            numbers2.reduce((a, b) => Math.max(a, b), 0),
          );
          ref.cleanup();
        },
      ),
    );
  });

  it("cleaned up computation stops re-running", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.array(fc.integer({ min: 1 }), { minLength: 1 }),
        (numbers1, numbers2) => {
          const ctx = makeCtx();
          const changes: ControlChange[] = [];
          const numberControls = ctx.newControl(numbers1);
          const newNumbers = [...numbers1, ...numbers2];
          const resultControl = ctx.newControl(-1);
          resultControl.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value,
          );
          const sum = (rc: any) =>
            rc
              .getElements(numberControls)
              .reduce((a: number, b: any) => a + rc.getValue(b), 0);
          const actualSum = numbers1.reduce((a, b) => a + b, 0);
          const ref = computed(ctx, resultControl, sum);
          expect(resultControl.valueNow).toStrictEqual(actualSum);
          ref.cleanup();
          ctx.update((wc) => wc.setValue(numberControls, newNumbers));
          expect(resultControl.valueNow).toStrictEqual(actualSum);
        },
      ),
    );
  });
});
