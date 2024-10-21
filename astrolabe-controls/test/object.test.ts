import fc from "fast-check";
import { describe, expect, it } from "@jest/globals";
import { ControlChange, newControl, ControlImpl } from "../src/controlImpl";

// Properties
describe("properties", () => {
  // string text always contains itself
  it("dirty flag for value", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const changes: ControlChange[] = [];
        const f = newControl(text);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        f.value = text + "a";
        f.runListeners();
        expect(changes).toStrictEqual([ControlChange.Value]);
        f.runListeners();
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
        f.runListeners();
        f.value = text + "b";
        f.runListeners();
        expect(changes).toStrictEqual([
          ControlChange.Value | ControlChange.Dirty,
          ControlChange.Value,
        ]);
        expect(changes2).toStrictEqual([ControlChange.Value]);
        f.runListeners();
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
        f.runListeners();
        f.unsubscribe(sub1);
        f.value = text + "b";
        f.runListeners();
        expect(changes).toStrictEqual([ControlChange.Value]);
      }),
    );
  });

  it("updating object doesnt change value", () => {
    fc.assert(
      fc.property(fc.string(), fc.boolean(), (v1, useFields) => {
        const obj = { v1 };
        const changes: ControlChange[] = [];
        const f = newControl(obj as Record<string, string>);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        if (useFields) {
          f.fields.v1.value = obj.v1;
        } else {
          f.value = { ...obj };
        }
        f.runListeners();
        expect(changes).toStrictEqual([]);
        return !f.dirty;
      }),
    );
  });

  it("updating object back to original is not dirty", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.boolean(),
        (v1, v2, useFields) => {
          fc.pre(v1 !== v2);
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
          f.runListeners();
          if (useFields) {
            f.fields.v.value = v1;
          } else {
            f.value = { v: v1 };
          }
          f.runListeners();
          expect(changes).toStrictEqual([
            ControlChange.Value | ControlChange.Dirty,
            ControlChange.Value | ControlChange.Dirty,
          ]);
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
        f.runListeners();
        expect(changes).toStrictEqual([]);
        return !f.dirty;
      }),
    );
  });

  it("updating child changes parent", () => {
    fc.assert(
      fc.property(fc.record({ v1: fc.string() }), (obj) => {
        const changes: ControlChange[] = [];
        const f = newControl(obj as Record<string, string>);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        f.fields.v1.value = obj.v1 + "a";
        f.runListeners();
        expect(changes).toStrictEqual([ControlChange.Value]);
        return f.dirty;
      }),
    );
  });
});
