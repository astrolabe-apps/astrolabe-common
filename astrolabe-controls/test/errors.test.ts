import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  ControlChange,
  newControl,
  notEmpty,
  removeElement,
  updateElements,
} from "../src";
import { arbitraryParentChild, getParentAndChild } from "./gen";

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
      fc.property(arbitraryParentChild, (json) => {
        const [parent, child] = getParentAndChild(json);
        const changes: ControlChange[] = [];
        parent.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        child.error = "Failed";
        expect(parent.valid).toStrictEqual(false);
        child.error = "";
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
      fc.property(arbitraryParentChild, (json) => {
        const [parent, child] = getParentAndChild(json);
        const changes: ControlChange[] = [];
        child.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        child.error = "error";
        expect(child.valid).toStrictEqual(false);
        expect(parent.valid).toStrictEqual(false);
        child.error = "";
        expect(child.valid).toStrictEqual(true);
        expect(parent.valid).toStrictEqual(true);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return parent.valid;
      }),
    );
  });

  it("removing invalid child reset parent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
        (strings) => {
          const parent = newControl([strings, strings], {
            elems: { elems: { validator: notEmpty("Not blank") } },
          });
          const changes: ControlChange[] = [];
          parent.subscribe((a, c) => changes.push(c), ControlChange.Valid);
          expect(parent.valid).toStrictEqual(true);
          const brokenParent = parent.elements[0];
          const brokenChild = brokenParent.elements[0];
          brokenChild.value = "";
          expect(brokenChild.valid).toStrictEqual(false);
          expect(parent.valid).toStrictEqual(false);
          removeElement(brokenParent, brokenChild);
          expect(parent.valid).toStrictEqual(true);
          updateElements(parent, () => []);
          expect(parent.valid).toStrictEqual(true);
          parent.value = [["a"], [""]];
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

  it("validate revalidates", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (msg) => {
        const control = newControl<string>("", {
          validator: notEmpty("Not blank"),
        });
        const changes: ControlChange[] = [];
        control.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        expect(control.error).toStrictEqual("Not blank");
        expect(control.valid).toStrictEqual(false);
        control.clearErrors();
        expect(control.valid).toStrictEqual(true);
        expect(control.error).toBeNull();
        const isValid = control.validate();
        expect(control.error).toStrictEqual("Not blank");
        expect(control.valid).toStrictEqual(false);
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
      fc.property(arbitraryParentChild, (json) => {
        const [parent, child] = getParentAndChild(json);
        const changes: ControlChange[] = [];
        parent.subscribe((a, c) => changes.push(c), ControlChange.Valid);
        child.error = "error";
        expect(child.valid).toStrictEqual(false);
        expect(parent.valid).toStrictEqual(false);
        parent.clearErrors();
        expect(child.valid).toStrictEqual(true);
        expect(parent.valid).toStrictEqual(true);
        expect(changes).toStrictEqual([
          ControlChange.Valid,
          ControlChange.Valid,
        ]);
        return parent.valid;
      }),
    );
  });
});
