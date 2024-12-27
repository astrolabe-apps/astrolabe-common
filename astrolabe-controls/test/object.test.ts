import fc from "fast-check";
import { describe, expect, it } from "@jest/globals";
import { Control, ControlChange, groupedChanges, newControl } from "../src";

// Properties
describe("object", () => {
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

function takeString(c: Control<string>) {
  typeCheck(c);
  throw new Error();
}

function typeCheck(c: Control<any>) {
  takeString(c);
  throw new Error();
}
