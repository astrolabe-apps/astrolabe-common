import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { ControlChange } from "../src/lib/types";
import { makeCtx } from "./index";

function notEmpty(msg: string) {
  return (v: string) => (!v ? msg : undefined);
}

describe("errors", () => {
  it("setting error makes control invalid", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (val) => {
        const ctx = makeCtx();
        const control = ctx.newControl(val);
        const changes: ControlChange[] = [];
        control.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        ctx.update((wc) => wc.setError(control, "default", "Error"));
        expect(control.validNow).toStrictEqual(false);
        ctx.update((wc) => wc.setError(control, "default", ""));
        expect(control.validNow).toStrictEqual(true);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return control.validNow;
      }),
    );
  });

  it("setting child error makes control invalid", () => {
    fc.assert(
      fc.property(fc.string(), (v) => {
        const ctx = makeCtx();
        const parent = ctx.newControl({ v });
        const child = parent.fields.v;
        const changes: ControlChange[] = [];
        parent.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        ctx.update((wc) => wc.setError(child, "default", "Failed"));
        expect(parent.validNow).toStrictEqual(false);
        ctx.update((wc) => wc.setError(child, "default", ""));
        expect(parent.validNow).toStrictEqual(true);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return parent.validNow;
      }),
    );
  });

  it("error state is cleared by clearing errors", () => {
    fc.assert(
      fc.property(fc.string(), (v) => {
        const ctx = makeCtx();
        const parent = ctx.newControl({ v });
        const child = parent.fields.v;
        const changes: ControlChange[] = [];
        child.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        ctx.update((wc) => wc.setError(child, "default", "error"));
        expect(child.validNow).toStrictEqual(false);
        expect(parent.validNow).toStrictEqual(false);
        ctx.update((wc) => wc.setError(child, "default", ""));
        expect(child.validNow).toStrictEqual(true);
        expect(parent.validNow).toStrictEqual(true);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return parent.validNow;
      }),
    );
  });

  it("removing invalid child resets parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
        (strings) => {
          const ctx = makeCtx();
          const parent = ctx.newControl([strings, strings], {
            elems: { elems: { validator: notEmpty("Not blank") } },
          });
          const changes: ControlChange[] = [];
          parent.subscribe((a, c) => changes.push(c), ControlChange.Valid);
          expect(parent.validNow).toStrictEqual(true);
          const brokenParent = parent.elements[0];
          const brokenChild = brokenParent.elements[0];
          ctx.update((wc) => wc.setValue(brokenChild, ""));
          expect(brokenChild.validNow).toStrictEqual(false);
          expect(parent.validNow).toStrictEqual(false);
          ctx.update((wc) => wc.removeElement(brokenParent, brokenChild));
          expect(parent.validNow).toStrictEqual(true);
          ctx.update((wc) => wc.updateElements(parent, () => []));
          expect(parent.validNow).toStrictEqual(true);
          ctx.update((wc) => wc.setValue(parent, [["a"], [""]]));
          expect(parent.validNow).toStrictEqual(false);
          ctx.update((wc) => wc.removeElement(parent, 1));
          expect(parent.validNow).toStrictEqual(true);
          expect(changes).toStrictEqual([
            ControlChange.Valid,
            ControlChange.Valid,
            ControlChange.Valid,
            ControlChange.Valid,
          ]);
          return parent.validNow;
        },
      ),
    );
  });

  it("setup validation runs on value changes", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (msg) => {
        const ctx = makeCtx();
        const control = ctx.newControl<string>("", {
          validator: notEmpty("Not blank"),
        });
        const changes: ControlChange[] = [];
        control.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        expect(control.errorNow).toStrictEqual("Not blank");
        expect(control.validNow).toStrictEqual(false);
        ctx.update((wc) => wc.setValue(control, "a"));
        expect(control.validNow).toStrictEqual(true);
        expect(control.errorNow).toBeNull();
        expect(changes).toStrictEqual([ControlChange.Valid]);
        return control.validNow;
      }),
    );
  });

  it("validate revalidates", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (msg) => {
        const ctx = makeCtx();
        const control = ctx.newControl<string>("", {
          validator: notEmpty("Not blank"),
        });
        const changes: ControlChange[] = [];
        control.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        expect(control.errorNow).toStrictEqual("Not blank");
        expect(control.validNow).toStrictEqual(false);
        ctx.update((wc) => wc.clearErrors(control));
        expect(control.validNow).toStrictEqual(true);
        expect(control.errorNow).toBeNull();
        let isValid = true;
        ctx.update((wc) => {
          isValid = wc.validate(control);
        });
        expect(control.errorNow).toStrictEqual("Not blank");
        expect(control.validNow).toStrictEqual(false);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return !isValid;
      }),
    );
  });

  it("child errors are cleared by clearing parent", () => {
    fc.assert(
      fc.property(fc.string(), (v) => {
        const ctx = makeCtx();
        const parent = ctx.newControl({ v });
        const child = parent.fields.v;
        const changes: ControlChange[] = [];
        parent.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        ctx.update((wc) => wc.setError(child, "default", "error"));
        expect(child.validNow).toStrictEqual(false);
        expect(parent.validNow).toStrictEqual(false);
        ctx.update((wc) => wc.clearErrors(parent));
        expect(child.validNow).toStrictEqual(true);
        expect(parent.validNow).toStrictEqual(true);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return parent.validNow;
      }),
    );
  });
});
