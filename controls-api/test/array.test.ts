import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { ControlChange } from "../src/lib/types";
import { getElementIndex } from "../src/lib/controlUtils";
import { makeCtx } from "./index";
import { arrayAndIndex } from "./gen";

describe("array", () => {
  it("updating array element list changes parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ v1: fc.string(), v2: fc.string() })),
        (obj) => {
          const ctx = makeCtx();
          const val1 = obj.map((x) => x.v1);
          const val2 = obj.map((x) => x.v2);
          const arr1 = ctx.newControl(val1);
          const elems2 = val2.map((x) => ctx.newControl(x));
          const origElems = arr1.elements;
          ctx.update((wc) =>
            wc.updateElements(arr1, (x) => [...elems2, ...x]),
          );
          expect(arr1.valueNow).toStrictEqual([...val2, ...val1]);
          expect(arr1.initialValueNow).toStrictEqual(val1);
          expect(elems2.map((x) => x.initialValueNow)).toStrictEqual(val2);
          expect(origElems.map((x) => x.initialValueNow)).toStrictEqual(val1);
        },
      ),
    );
  });

  it("updating array child changes parent", () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 1 }), (obj) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const f = ctx.newControl(obj);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        ctx.update((wc) => wc.setValue(f.elements[0], obj[0] + "a"));
        expect(changes).toStrictEqual([ControlChange.Value]);
        expect(f.valueNow).toStrictEqual([obj[0] + "a", ...obj.slice(1)]);
        return f.dirtyNow;
      }),
    );
  });

  it("updating array child's initial value doesnt affect parents initial value", () => {
    fc.assert(
      fc.property(arrayAndIndex, ([obj, ind]) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const f = ctx.newControl(obj);
        f.subscribe((a, c) => changes.push(c), ControlChange.InitialValue);
        ctx.update((wc) =>
          wc.setInitialValue(f.elements[ind], obj[ind] + "a"),
        );
        expect(changes).toStrictEqual([]);
        expect(f.initialValueNow).toStrictEqual(obj);
        return !f.dirtyNow;
      }),
    );
  });

  it("updating array element values changes parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ v1: fc.string(), v2: fc.string() })),
        (obj) => {
          const ctx = makeCtx();
          const arr1 = ctx.newControl(obj.map((x) => x.v1));
          const elems1 = arr1.elements;
          ctx.update((wc) =>
            elems1.forEach((c, i) => wc.setValue(c, obj[i].v2)),
          );
          expect(arr1.valueNow).toStrictEqual([...obj.map((x) => x.v2)]);
        },
      ),
    );
  });

  it("updating array doesnt change value", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true })), (obj) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const f = ctx.newControl(obj);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        ctx.update((wc) => wc.setValue(f, [...obj]));
        expect(changes).toStrictEqual([]);
        return !f.dirtyNow;
      }),
    );
  });

  it("updating array elements that were detached doesnt change parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ v1: fc.string(), v2: fc.string() })),
        (obj) => {
          const ctx = makeCtx();
          const arr1 = ctx.newControl(obj.map((x) => x.v1));
          const arr2 = ctx.newControl(obj.map((x) => x.v2));
          const elems2 = arr2.elements;
          ctx.update((wc) => wc.setValue(arr2, []));
          ctx.update((wc) =>
            elems2.forEach((c, i) => wc.setValue(c, obj[i].v1)),
          );
          ctx.update((wc) =>
            wc.updateElements(arr1, (x) => [...x, ...elems2]),
          );
          expect(arr2.valueNow).toStrictEqual([]);
        },
      ),
    );
  });

  it("adding element to array", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (numArray) => {
        const ctx = makeCtx();
        const control = ctx.newControl(numArray);
        ctx.update((wc) => wc.addElement(control, 0));
        expect(control.valueNow).toStrictEqual([...numArray, 0]);
        ctx.update((wc) => wc.addElement(control, -1, 0));
        expect(control.valueNow).toStrictEqual([-1, ...numArray, 0]);
        ctx.update((wc) => wc.addElement(control, -2, 0, true));
        expect(control.valueNow).toStrictEqual([-1, -2, ...numArray, 0]);
        ctx.update((wc) => wc.setValue(control.elements[0], 1));
        expect(control.valueNow).toStrictEqual([1, -2, ...numArray, 0]);
      }),
    );
  });

  it("updating array parent to null detaches child elements", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const childChanges: ControlChange[] = [];
        const control = ctx.newControl<string[] | null>([childValue]);
        ctx.update((wc) => wc.setInitialValue(control, []));
        control.subscribe(
          (a, c) => changes.push(c),
          ControlChange.Value | ControlChange.InitialValue,
        );
        const child = control.elements[0];
        ctx.update((wc) => wc.setValue(child, childValue + "a"));
        child.subscribe(
          (a, c) => childChanges.push(c),
          ControlChange.Value | ControlChange.InitialValue,
        );
        ctx.update((wc) => wc.setValue(control, null));
        expect(child.valueNow).toStrictEqual(childValue + "a");
        // Should not update parent
        ctx.update((wc) => wc.setValue(child, childValue + "b"));
        ctx.update((wc) => wc.setInitialValue(child, childValue + "c"));
        expect(control.valueNow).toStrictEqual(null);
        // Should not update child
        ctx.update((wc) => wc.setValue(control, [childValue]));
        expect(child.valueNow).toStrictEqual(childValue + "b");
        // should update parent value, leave child initial value unchanged
        ctx.update((wc) => wc.updateElements(control as any, () => [child]));
        expect(child.valueNow).toStrictEqual(childValue + "b");
        expect(child.initialValueNow).toStrictEqual(childValue + "c");
        expect(control.valueNow).toStrictEqual([childValue + "b"]);
        // parent should change child
        ctx.update((wc) => wc.setValue(control, [childValue]));
        expect(child.valueNow).toStrictEqual(childValue);
        // Attached child does not update parent initial value
        ctx.update((wc) => wc.setInitialValue(child, childValue + "c"));
        expect(control.initialValueNow).toStrictEqual([]);
        expect(changes).toStrictEqual([
          ControlChange.Value,
          ControlChange.Value,
          ControlChange.Value,
          ControlChange.Value,
          ControlChange.Value,
        ]);
        expect(childChanges).toStrictEqual([
          ControlChange.Value,
          ControlChange.InitialValue,
          ControlChange.Value,
        ]);
      }),
    );
  });

  it("getElementIndex is correct after removing element", () => {
    fc.assert(
      fc.property(arrayAndIndex, arrayAndIndex, ([obj, ind], [obj2, ind2]) => {
        const ctx = makeCtx();
        const control = ctx.newControl(obj);
        expect(control.elements.map((x) => getElementIndex(x))).toStrictEqual(
          control.elements.map((_, i) => ({ index: i, initialIndex: i })),
        );
        ctx.update((wc) => wc.removeElement(control, ind));
        expect(control.elements.map((x) => getElementIndex(x))).toStrictEqual(
          control.elements.map((_, i) => ({
            index: i,
            initialIndex: i >= ind ? i + 1 : i,
          })),
        );
        ctx.update((wc) => wc.setInitialValue(control, obj2));
        expect(control.elements.map((x) => getElementIndex(x))).toStrictEqual(
          control.elements.map((_, i) => ({ index: i, initialIndex: i })),
        );
        ctx.update((wc) => wc.removeElement(control, ind2));
        expect(control.elements.map((x) => getElementIndex(x))).toStrictEqual(
          control.elements.map((_, i) => ({
            index: i,
            initialIndex: i >= ind2 ? i + 1 : i,
          })),
        );
      }),
    );
  });

  it("getElementIndex is correct after adding element", () => {
    fc.assert(
      fc.property(arrayAndIndex, ([obj, ind]) => {
        const ctx = makeCtx();
        const control = ctx.newControl(obj);
        ctx.update((wc) => wc.addElement(control, "", ind));
        expect(control.elements.map((x) => getElementIndex(x))).toStrictEqual(
          control.elements.map((_, i) => ({
            index: i,
            initialIndex: i == ind ? undefined : i < ind ? i : i - 1,
          })),
        );
      }),
    );
  });

  it("getElementIndex is correct after re-ordering elements", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.integer())
          .map((x) =>
            Object.values(Object.fromEntries(x.map((n) => [n, n]))),
          ),
        (obj) => {
          const ctx = makeCtx();
          const control = ctx.newControl(obj);
          ctx.update((wc) =>
            wc.updateElements(control, (x) =>
              [...x].sort((a, b) => a.valueNow - b.valueNow),
            ),
          );
          expect(control.elements.map((x) => getElementIndex(x))).toStrictEqual(
            control.elements.map((c, i) => ({
              index: i,
              initialIndex: obj.indexOf(c.valueNow),
            })),
          );
        },
      ),
    );
  });
});
