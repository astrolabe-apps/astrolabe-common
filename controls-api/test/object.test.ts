import fc from "fast-check";
import { describe, expect, it } from "@jest/globals";
import { ControlChange } from "../src/lib/types";
import { makeCtx } from "./index";

describe("object", () => {
  it("updating object doesnt change value", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.boolean(),
        fc.boolean(),
        (v1, useFields, useVal) => {
          const ctx = makeCtx();
          const obj = { v1 };
          const changes: ControlChange[] = [];
          const f = ctx.newControl(obj as Record<string, string>);
          f.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value | ControlChange.InitialValue,
          );
          ctx.update((wc) => {
            if (useFields) {
              if (useVal) wc.setValue(f.fields.v1, obj.v1);
              else wc.setInitialValue(f.fields.v1, obj.v1);
            } else {
              if (useVal) wc.setValue(f, { ...obj });
              else wc.setInitialValue(f, { ...obj });
            }
          });
          expect(changes).toStrictEqual([]);
          return !f.dirtyNow;
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
          const ctx = makeCtx();
          const changes: ControlChange[] = [];
          const f = ctx.newControl({ v: v1 });
          f.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value | ControlChange.Dirty,
          );
          ctx.update((wc) => {
            if (useFields) wc.setValue(f.fields.v, v2);
            else wc.setValue(f, { v: v2 });
          });
          ctx.update((wc) => {
            if (useFields2) wc.setValue(f.fields.v, v1);
            else wc.setValue(f, { v: v1 });
          });
          expect(changes).toStrictEqual([
            ControlChange.Value | ControlChange.Dirty,
            ControlChange.Value | ControlChange.Dirty,
          ]);
          return !f.dirtyNow;
        },
      ),
    );
  });

  it("batched updates prevent multiple events", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.boolean(),
        fc.boolean(),
        (v1, v2, useFields, useFields2) => {
          fc.pre(v1 !== v2);
          const ctx = makeCtx();
          const changes: ControlChange[] = [];
          const f = ctx.newControl({ v: v1 });
          f.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value | ControlChange.Dirty,
          );
          ctx.update((wc) => {
            if (useFields) wc.setValue(f.fields.v, v2);
            else wc.setValue(f, { v: v2 });
            if (useFields2) wc.setValue(f.fields.v, v1);
            else wc.setValue(f, { v: v1 });
          });
          expect(changes).toStrictEqual([ControlChange.Value]);
          return !f.dirtyNow;
        },
      ),
    );
  });

  it("updating object child changes parent", () => {
    fc.assert(
      fc.property(fc.record({ v1: fc.string() }), (obj) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const f = ctx.newControl(obj as Record<string, string>);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        ctx.update((wc) => wc.setValue(f.fields.v1, obj.v1 + "a"));
        expect(changes).toStrictEqual([ControlChange.Value]);
        return f.dirtyNow;
      }),
    );
  });

  it("updating object parent changes child", () => {
    fc.assert(
      fc.property(fc.string(), (v) => {
        const ctx = makeCtx();
        const parent = ctx.newControl({ v });
        const child = parent.fields.v;
        expect(child.valueNow).toStrictEqual(v);
        ctx.update((wc) => wc.setValue(parent, { v: v + "a" }));
        expect(child.valueNow).toStrictEqual(v + "a");
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
          const ctx = makeCtx();
          const f = ctx.newControl(obj.map((x) => x.v1));
          f.elements.forEach((x) => x.valueNow);
          ctx.update((wc) => wc.setValue(f, obj.map((x) => x.v2)));
          expect(f.valueNow).toStrictEqual(f.elements.map((x) => x.valueNow));
          ctx.update((wc) => wc.setInitialValue(f, iv));
          expect(f.elements.map((_, i) => iv[i])).toStrictEqual(
            f.elements.map((x) => x.initialValueNow),
          );
        },
      ),
    );
  });

  it("updating child fields of null parent makes parent not null", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const control = ctx.newControl<{ child: string } | undefined>(
          undefined,
        );
        control.subscribe((a, c) => changes.push(c), ControlChange.Value);
        const child = control.fields.child;
        ctx.update((wc) => wc.setValue(child, childValue));
        expect(control.valueNow).toStrictEqual({ child: childValue });
        expect(changes).toStrictEqual([ControlChange.Value]);
      }),
    );
  });

  it("updating parent to null makes child fields undefined", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const childChanges: ControlChange[] = [];
        const control = ctx.newControl<{ child: string } | null>({
          child: childValue,
        });
        control.subscribe((a, c) => changes.push(c), ControlChange.Value);
        const child = control.fields.child;
        ctx.update((wc) => wc.setValue(child, childValue + "a"));
        child.subscribe((a, c) => childChanges.push(c), ControlChange.Value);
        ctx.update((wc) => wc.setValue(control, null));
        expect(child.valueNow).toStrictEqual(undefined);
        ctx.update((wc) => wc.setValue(child, childValue + "b"));
        expect(control.valueNow).toStrictEqual({ child: childValue + "b" });
        ctx.update((wc) => wc.setValue(control, null));
        expect(control.valueNow).toStrictEqual(null);
        expect(child.valueNow).toStrictEqual(undefined);
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

  it("updating parent to null makes child fields undefined (initial value)", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const childChanges: ControlChange[] = [];
        const control = ctx.newControl<{ child: string } | null>({
          child: childValue,
        });
        control.subscribe(
          (a, c) => changes.push(c),
          ControlChange.InitialValue,
        );
        const child = control.fields.child;
        ctx.update((wc) => wc.setInitialValue(child, childValue + "a"));
        child.subscribe(
          (a, c) => childChanges.push(c),
          ControlChange.InitialValue,
        );
        ctx.update((wc) => wc.setInitialValue(control, null));
        expect(child.initialValueNow).toStrictEqual(undefined);
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
          const ctx = makeCtx();
          const changes: ControlChange[] = [];
          const f = ctx.newControl<number[] | null>(arr1val);
          f.elements;
          f.subscribe((a, c) => changes.push(c), ControlChange.Structure);
          ctx.update((wc) => wc.setValue(f, arr2val));
          expect(changes).toStrictEqual(
            arr1val.length != arr2val.length ? [ControlChange.Structure] : [],
          );
          changes.length = 0;
          ctx.update((wc) => wc.setValue(f, null));
          expect(changes).toStrictEqual([ControlChange.Structure]);
        },
      ),
    );
  });

  it("structure changes get notified", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), (num) => {
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const f = ctx.newControl<{ num: number } | null>({ num });
        f.subscribe((a, c) => changes.push(c), ControlChange.Structure);
        ctx.update((wc) => wc.setValue(f, null));
        ctx.update((wc) => wc.setValue(f, { num }));
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
        const ctx = makeCtx();
        const changes: ControlChange[] = [];
        const control = ctx.newControl<string>(childValue);
        control.subscribe((a, c) => changes.push(c), ControlChange.Disabled);
        ctx.update((wc) => wc.setDisabled(control, true));
        ctx.update((wc) => wc.setDisabled(control, false));
        ctx.update((wc) => wc.setDisabled(control, true));
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
        const ctx = makeCtx();
        const copy1 = { v1: childValue };
        const copy2 = { v1: childValue };
        const control = ctx.newControl(copy2);
        const controlValue = control.valueNow;
        expect(controlValue).toStrictEqual(copy1);
        ctx.update((wc) => wc.setValue(control.fields.v1, childValue + "a"));
        ctx.update((wc) => wc.setValue(control.fields.v1, childValue + "b"));
        expect(controlValue).toStrictEqual(copy1);
      }),
    );
  });

  it("values never get mutated (object array)", () => {
    fc.assert(
      fc.property(fc.string(), (childValue) => {
        const ctx = makeCtx();
        const copy1 = [{ v1: childValue }];
        const copy2 = [{ v1: childValue }];
        const control = ctx.newControl(copy2);
        const controlValue = control.valueNow;
        expect(controlValue).toStrictEqual(copy1);
        ctx.update((wc) =>
          wc.setValue(control.elements[0].fields.v1, childValue + "a"),
        );
        const controlValue2 = control.valueNow;
        ctx.update((wc) =>
          wc.setValue(control.elements[0].fields.v1, childValue + "b"),
        );
        expect(controlValue).toStrictEqual(copy1);
        expect(controlValue2).toStrictEqual([{ v1: childValue + "a" }]);
      }),
    );
  });
});
