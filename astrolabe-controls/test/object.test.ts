import fc from "fast-check";
import { describe, expect, it } from "@jest/globals";
import {
  ControlChange,
  groupedChanges,
  newControl,
  updateElements,
} from "../src/controlImpl";

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
        fc.boolean(),
        (v1, v2, useFields, useFields2, useVal) => {
          fc.pre(v1 !== v2);
          const valProp = useVal ? "value" : "initialValue";
          const change = useVal
            ? ControlChange.Value
            : ControlChange.InitialValue;
          const changes: ControlChange[] = [];
          const f = newControl({ v: v1 });
          f.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value |
              ControlChange.InitialValue |
              ControlChange.Dirty,
          );
          if (useFields) {
            f.fields.v[valProp] = v2;
          } else {
            f[valProp] = { v: v2 };
          }
          if (useFields2) {
            f.fields.v[valProp] = v1;
          } else {
            f[valProp] = { v: v1 };
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

  it("updating array parent changes child", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ v1: fc.string(), v2: fc.string() }), {
          minLength: 1,
        }),
        (obj) => {
          const f = newControl(obj.map((x) => x.v1));
          f.elements.forEach((x) => x.value);
          f.value = obj.map((x) => x.v2);
          expect(f.value).toStrictEqual(f.elements.map((x) => x.value));
        },
      ),
    );
  });

  it("updating array elements changes parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ v1: fc.string(), v2: fc.string() })),
        (obj) => {
          const arr1 = newControl(obj.map((x) => x.v1));
          const arr2 = newControl(obj.map((x) => x.v2));
          const elems2 = arr2.elements;
          arr2.value = [];
          updateElements(arr1, (x) => [...x, ...elems2]);
          expect(arr1.value).toStrictEqual([
            ...obj.map((x) => x.v1),
            ...obj.map((x) => x.v2),
          ]);
        },
      ),
    );
  });
});
