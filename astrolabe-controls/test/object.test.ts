import fc, { Arbitrary } from "fast-check";
import { describe, expect, it } from "@jest/globals";
import {
  ControlChange,
  groupedChanges,
  newControl,
  updateElements,
} from "../src";

// Properties
describe("properties", () => {
  it("dirty flag for value", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const changes: ControlChange[] = [];
        const f = newControl(text);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        f.value = text + "a";
        expect(changes).toStrictEqual([ControlChange.Value]);
        return f.dirty;
      }),
    );
  });

  it("only get changes after subscription", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const changes: ControlChange[] = [];
        const changes2: ControlChange[] = [];
        const f = newControl(text);
        f.subscribe(
          (a, c) => changes.push(c),
          ControlChange.Value | ControlChange.Dirty,
        );
        f.value = text + "a";
        f.subscribe((a, c) => changes2.push(c), ControlChange.Value);
        f.value = text + "b";
        expect(changes).toStrictEqual([
          ControlChange.Value | ControlChange.Dirty,
          ControlChange.Value,
        ]);
        expect(changes2).toStrictEqual([ControlChange.Value]);
        return f.dirty;
      }),
    );
  });

  it("dont get changes after unsubscribe", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const changes: ControlChange[] = [];
        const f = newControl(text);
        const sub1 = f.subscribe(
          (a, c) => changes.push(c),
          ControlChange.Value,
        );
        f.value = text + "a";
        f.unsubscribe(sub1);
        f.value = text + "b";
        expect(changes).toStrictEqual([ControlChange.Value]);
      }),
    );
  });

  it("updating object doesnt change value", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.boolean(),
        fc.boolean(),
        (v1, useFields, useVal) => {
          const obj = { v1 };
          const changes: ControlChange[] = [];
          const valProp = useVal ? "value" : "initialValue";
          const f = newControl(obj as Record<string, string>);
          f.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value | ControlChange.InitialValue,
          );
          if (useFields) {
            f.fields.v1[valProp] = obj.v1;
          } else {
            f[valProp] = { ...obj };
          }
          expect(changes).toStrictEqual([]);
          return !f.dirty;
        },
      ),
    );
  });

  it("updating object back to original is not dirty", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.boolean(),
        fc.boolean(),
        (v1, v2, useFields, useFields2) => {
          fc.pre(v1 !== v2);
          const change = ControlChange.Value;
          const changes: ControlChange[] = [];
          const f = newControl({ v: v1 });
          f.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value | ControlChange.Dirty,
          );
          if (useFields) {
            f.fields.v.value = v2;
          } else {
            f.value = { v: v2 };
          }
          if (useFields2) {
            f.fields.v.value = v1;
          } else {
            f.value = { v: v1 };
          }
          expect(changes).toStrictEqual([
            change | ControlChange.Dirty,
            change | ControlChange.Dirty,
          ]);
          return !f.dirty;
        },
      ),
    );
  });

  it("grouped updates prevent multiple events", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.boolean(),
        fc.boolean(),
        (v1, v2, useFields, useFields2) => {
          fc.pre(v1 !== v2);
          const changes: ControlChange[] = [];
          const f = newControl({ v: v1 });
          f.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value | ControlChange.Dirty,
          );
          groupedChanges(() => {
            if (useFields) {
              f.fields.v.value = v2;
            } else {
              f.value = { v: v2 };
            }
            if (useFields2) {
              f.fields.v.value = v1;
            } else {
              f.value = { v: v1 };
            }
          });
          expect(changes).toStrictEqual([ControlChange.Value]);
          return !f.dirty;
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

  it("updating object child changes parent", () => {
    fc.assert(
      fc.property(fc.record({ v1: fc.string() }), (obj) => {
        const changes: ControlChange[] = [];
        const f = newControl(obj as Record<string, string>);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        f.fields.v1.value = obj.v1 + "a";
        expect(changes).toStrictEqual([ControlChange.Value]);
        return f.dirty;
      }),
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

  it("updating object parent changes child", () => {
    fc.assert(
      fc.property(fc.string(), (v) => {
        const parent = newControl({ v });
        const child = parent.fields.v;
        expect(child.value).toStrictEqual(v);
        parent.value = { v: v + "a" };
        expect(child.value).toStrictEqual(v + "a");
      }),
    );
  });

  it("updating array parent changes child", () => {
    fc.assert(
      fc.property(
        fc.record({
          v: fc.array(fc.record({ v1: fc.string(), v2: fc.string() })),
          iv: fc.array(fc.string()),
        }),
        ({ v: obj, iv }) => {
          const f = newControl(obj.map((x) => x.v1));
          f.elements.forEach((x) => x.value);
          f.value = obj.map((x) => x.v2);
          expect(f.value).toStrictEqual(f.elements.map((x) => x.value));
          f.initialValue = iv;
          expect(f.elements.map((_, i) => iv[i])).toStrictEqual(
            f.elements.map((x) => x.initialValue),
          );
        },
      ),
    );
  });

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

  it("updating child fields of null parent makes parent not null", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const changes: ControlChange[] = [];
        const control = newControl<{ child: string } | undefined>(undefined);
        control.subscribe((a, c) => changes.push(c), ControlChange.Value);
        const child = control.fields.child;
        child.value = childValue;
        expect(control.value).toStrictEqual({ child: childValue });
        expect(changes).toStrictEqual([ControlChange.Value]);
      }),
    );
  });

  it("updating parent to null make child fields undefined", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const changes: ControlChange[] = [];
        const childChanges: ControlChange[] = [];
        const control = newControl<{ child: string } | null>({
          child: childValue,
        });
        control.subscribe((a, c) => changes.push(c), ControlChange.Value);
        const child = control.fields.child;
        child.value = childValue + "a";
        child.subscribe((a, c) => childChanges.push(c), ControlChange.Value);
        control.value = null;
        expect(child.value).toStrictEqual(undefined);
        child.value = childValue + "b";
        expect(control.value).toStrictEqual({ child: childValue + "b" });
        control.value = null;
        expect(control.value).toStrictEqual(null);
        expect(child.value).toStrictEqual(undefined);
        expect(changes).toStrictEqual([
          ControlChange.Value,
          ControlChange.Value,
          ControlChange.Value,
          ControlChange.Value,
        ]);
        expect(childChanges).toStrictEqual([
          ControlChange.Value,
          ControlChange.Value,
          ControlChange.Value,
        ]);
      }),
    );
  });

  it("updating parent to null make child fields undefined (initial value)", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const changes: ControlChange[] = [];
        const childChanges: ControlChange[] = [];
        const control = newControl<{ child: string } | null>({
          child: childValue,
        });
        control.subscribe(
          (a, c) => changes.push(c),
          ControlChange.InitialValue,
        );
        const child = control.fields.child;
        child.initialValue = childValue + "a";
        child.subscribe(
          (a, c) => childChanges.push(c),
          ControlChange.InitialValue,
        );
        control.initialValue = null;
        expect(child.initialValue).toStrictEqual(undefined);
        expect(changes).toStrictEqual([ControlChange.InitialValue]);
        expect(childChanges).toStrictEqual([ControlChange.InitialValue]);
      }),
    );
  });

  it("array structure changes get notified", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true })),
        fc.array(fc.double({ noNaN: true })),
        (arr1val, arr2val) => {
          const changes: ControlChange[] = [];
          const f = newControl<number[] | null>(arr1val);
          f.elements;
          f.subscribe((a, c) => changes.push(c), ControlChange.Structure);
          f.value = arr2val;
          expect(changes).toStrictEqual(
            arr1val.length != arr2val.length ? [ControlChange.Structure] : [],
          );
          changes.length = 0;
          f.value = null;
          expect(changes).toStrictEqual([ControlChange.Structure]);
        },
      ),
    );
  });

  it("structure changes get notified", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), (num) => {
        const changes: ControlChange[] = [];
        const f = newControl<{ num: number } | null>({ num });
        f.subscribe((a, c) => changes.push(c), ControlChange.Structure);
        f.value = null;
        f.value = { num };
        expect(changes).toStrictEqual([
          ControlChange.Structure,
          ControlChange.Structure,
        ]);
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

  it("changing disabled updates subscriptions", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const changes: ControlChange[] = [];
        const control = newControl<string>(childValue);
        control.subscribe((a, c) => changes.push(c), ControlChange.Disabled);
        control.disabled = true;
        control.disabled = false;
        control.disabled = true;
        expect(changes).toStrictEqual([
          ControlChange.Disabled,
          ControlChange.Disabled,
          ControlChange.Disabled,
        ]);
      }),
    );
  });

  it("values never get mutated (object)", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const changes: ControlChange[] = [];
        const copy1 = { v1: childValue };
        const copy2 = { v1: childValue };
        const control = newControl(copy2);
        const controlValue = control.value;
        expect(controlValue).toStrictEqual(copy1);
        control.fields.v1.value = childValue + "a";
        control.fields.v1.value = childValue + "b";
        expect(controlValue).toStrictEqual(copy1);
      }),
    );
  });

  it("values never get mutated (object array)", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const changes: ControlChange[] = [];
        const copy1 = [{ v1: childValue }];
        const copy2 = [{ v1: childValue }];
        const control = newControl(copy2);
        const controlValue = control.value;
        expect(controlValue).toStrictEqual(copy1);
        control.elements[0].fields.v1.value = childValue + "a";
        const controlValue2 = control.value;
        control.elements[0].fields.v1.value = childValue + "b";
        expect(controlValue).toStrictEqual(copy1);
        expect(controlValue2).toStrictEqual([{ v1: childValue + "a" }]);
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
