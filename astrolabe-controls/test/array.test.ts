import { describe, expect, it } from "@jest/globals";
import fc, { Arbitrary } from "fast-check";
import { ControlChange, newControl, updateElements } from "../src";
import { addElement } from "../src";

describe("array", () => {
  it("updating array element list changes parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ v1: fc.string(), v2: fc.string() })),
        (obj) => {
          const val1 = obj.map((x) => x.v1);
          const val2 = obj.map((x) => x.v2);
          const arr1 = newControl(val1);
          const elems2 = val2.map((x) => newControl(x));
          const origElems = arr1.elements;
          updateElements(arr1, (x) => [...elems2, ...x]);
          expect(arr1.value).toStrictEqual([...val2, ...val1]);
          expect(arr1.initialValue).toStrictEqual(val1);
          expect(elems2.map((x) => x.initialValue)).toStrictEqual(val2);
          expect(origElems.map((x) => x.initialValue)).toStrictEqual(val1);
        },
      ),
    );
  });

  it("updating array child changes parent", () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 1 }), (obj) => {
        const changes: ControlChange[] = [];
        const f = newControl(obj);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        f.elements[0].value = obj[0] + "a";
        expect(changes).toStrictEqual([ControlChange.Value]);
        expect(f.value).toStrictEqual([obj[0] + "a", ...obj.slice(1)]);
        return f.dirty;
      }),
    );
  });

  it("updating array child's initial value doesnt affect parents initial value", () => {
    fc.assert(
      fc.property(arrayAndIndex(), ([obj, ind]) => {
        const changes: ControlChange[] = [];
        const f = newControl(obj);
        f.subscribe((a, c) => changes.push(c), ControlChange.InitialValue);
        f.elements[ind].initialValue = obj[ind] + "a";
        expect(changes).toStrictEqual([]);
        expect(f.initialValue).toStrictEqual(obj);
        return !f.dirty;
      }),
    );
  });

  it("updating array element values changes parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ v1: fc.string(), v2: fc.string() })),
        (obj) => {
          const arr1 = newControl(obj.map((x) => x.v1));
          const elems1 = arr1.elements;
          elems1.forEach((c, i) => (c.value = obj[i].v2));
          expect(arr1.value).toStrictEqual([...obj.map((x) => x.v2)]);
        },
      ),
    );
  });

  it("updating array doesnt change value", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true })), (obj) => {
        const changes: ControlChange[] = [];
        const f = newControl(obj);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        f.value = [...obj];
        expect(changes).toStrictEqual([]);
        return !f.dirty;
      }),
    );
  });

  it("updating array elements that were detached doesnt change parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ v1: fc.string(), v2: fc.string() })),
        (obj) => {
          const arr1 = newControl(obj.map((x) => x.v1));
          const arr2 = newControl(obj.map((x) => x.v2));
          const elems2 = arr2.elements;
          arr2.value = [];
          elems2.forEach((c, i) => (c.value = obj[i].v1));
          updateElements(arr1, (x) => [...x, ...elems2]);
          expect(arr2.value).toStrictEqual([]);
        },
      ),
    );
  });

  it("adding element to array", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (numArray) => {
        const control = newControl(numArray);
        addElement(control, 0);
        expect(control.value).toStrictEqual([...numArray, 0]);
        addElement(control, -1, 0);
        expect(control.value).toStrictEqual([-1, ...numArray, 0]);
        addElement(control, -2, 0, true);
        expect(control.value).toStrictEqual([-1, -2, ...numArray, 0]);
        control.elements[0].value = 1;
        expect(control.value).toStrictEqual([1, -2, ...numArray, 0]);
      }),
    );
  });

  it("updating array parent to null make child fields detach", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const changes: ControlChange[] = [];
        const childChanges: ControlChange[] = [];
        const control = newControl<string[] | null>([childValue]);
        control.initialValue = [];
        control.subscribe(
          (a, c) => changes.push(c),
          ControlChange.Value | ControlChange.InitialValue,
        );
        const child = control.elements[0];
        child.value = childValue + "a";
        child.subscribe(
          (a, c) => childChanges.push(c),
          ControlChange.Value | ControlChange.InitialValue,
        );
        control.value = null;
        expect(child.value).toStrictEqual(childValue + "a");
        // Should not update parent
        child.value = childValue + "b";
        child.initialValue = childValue + "c";
        expect(control.value).toStrictEqual(null);
        // Should not update child
        control.value = [childValue];
        expect(child.value).toStrictEqual(childValue + "b");
        // should update parent value, leave child initial value unchanged
        updateElements(control, () => [child]);
        expect(child.value).toStrictEqual(childValue + "b");
        expect(child.initialValue).toStrictEqual(childValue + "c");
        expect(control.value).toStrictEqual([childValue + "b"]);
        // parent should change child
        control.value = [childValue];
        expect(child.value).toStrictEqual(childValue);
        // Attached child does not update parent initial value
        child.initialValue = childValue + "c";
        expect(control.initialValue).toStrictEqual([]);
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
});

function arrayAndIndex(): Arbitrary<[string[], number]> {
  return fc
    .array(fc.string(), { minLength: 1 })
    .chain((x) =>
      fc.tuple(fc.constant(x), fc.integer({ min: 0, max: x.length - 1 })),
    );
}
