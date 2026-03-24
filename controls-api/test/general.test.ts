import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { Control, ControlChange } from "../src/lib/types";
import { lookupControl, getControlPath } from "../src/lib/controlUtils";
import { makeCtx } from "./index";
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
});
