import { compareJson, clickLabel } from "./utils";

const initial = {
  visible: false,
  disabled: false,
  readonly: false,
  defaultValue: "",
  dynamic: null,
};

describe("dynamic properties", () => {
  it("passes", () => {
    cy.visit("http://localhost:5173/dynamic");
    cy.get("input.defaultValue").type("Dynamic Value");
    clickLabel("Visible");
    cy.get("input.dynamicText").type("At the end");
    clickLabel("Disabled");
    clickLabel("Readonly");
    cy.get("input.dynamicText")
      .should("be.disabled")
      .should("have.attr", "readonly");
    clickLabel("Disabled");
    clickLabel("Readonly");
    cy.get("input.dynamicText")
      .should("not.be.disabled")
      .should("not.have.attr", "readonly");
    cy.get("pre").should(
      compareJson({
        ...initial,
        visible: true,
        defaultValue: "Dynamic Value",
        dynamic: "Dynamic ValueAt the end",
      }),
    );
  });
});
