import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  ControlChange,
  newControl,
  notEmpty,
  removeElement,
  updateElements,
} from "../src";

describe("errors", () => {
  it("setting error makes control invalid", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (val) => {
        const control = newControl(val);
        const changes: ControlChange[] = [];
        control.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        control.error = "Error";
        expect(control.valid).toStrictEqual(false);
        control.error = "";
        expect(control.valid).toStrictEqual(true);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return control.valid;
      }),
    );
  });

  it("setting child error makes control invalid", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (msg) => {
        const parent = newControl({ child: "" });
        const control = parent.fields.child;
        const changes: ControlChange[] = [];
        parent.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        control.error = msg;
        expect(parent.valid).toStrictEqual(false);
        control.error = "";
        expect(parent.valid).toStrictEqual(true);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return parent.valid;
      }),
    );
  });

  it("error state is cleared by changing value", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (v) => {
        const control = newControl(v);
        const changes: ControlChange[] = [];
        control.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        control.error = "error";
        expect(control.valid).toStrictEqual(false);
        control.error = "";
        expect(control.valid).toStrictEqual(true);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return control.valid;
      }),
    );
  });

  it("removing invalid child reset parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
        (strings) => {
          const parent = newControl(strings, {
            elems: { validator: notEmpty("Not blank") },
          });
          const changes: ControlChange[] = [];
          parent.subscribe((a, c) => changes.push(c), ControlChange.Valid);
          expect(parent.valid).toStrictEqual(true);
          parent.elements[0].value = "";
          expect(parent.valid).toStrictEqual(false);
          updateElements(parent, () => []);
          expect(parent.valid).toStrictEqual(true);
          parent.value = ["a", ""];
          expect(parent.valid).toStrictEqual(false);
          removeElement(parent, 1);
          expect(parent.valid).toStrictEqual(true);
          expect(changes).toStrictEqual([
            ControlChange.Valid,
            ControlChange.Valid,
            ControlChange.Valid,
            ControlChange.Valid,
          ]);
          return parent.valid;
        },
      ),
    );
  });

  it("setup validation runs on value changes", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (msg) => {
        const control = newControl<string>("", {
          validator: notEmpty("Not blank"),
        });
        const changes: ControlChange[] = [];
        control.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        expect(control.error).toStrictEqual("Not blank");
        expect(control.valid).toStrictEqual(false);
        control.value = "a";
        expect(control.valid).toStrictEqual(true);
        expect(control.error).toBeNull();
        expect(changes).toStrictEqual([ControlChange.Valid]);
        return control.valid;
      }),
    );
  });
});
