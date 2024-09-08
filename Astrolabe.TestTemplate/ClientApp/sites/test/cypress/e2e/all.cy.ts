import { compareJson as cj, control, clickLabel } from "./utils";

function compareJson(compare: any): any {
  cy.get("pre").then(cj(compare));
  return compare;
}
describe("all controls", () => {
  it("passes", () => {
    cy.visit("http://localhost:5173/all");

    cy.get("div.text-display").contains("This is some plain text");
    cy.get("b.html-display").contains("Html display");
    let next = compareJson({
      text: "",
      int: 1,
      double: 2.5,
      stringArray: [],
    });

    cy.contains("Add String").click();
    next = compareJson({ ...next, stringArray: [null] });
    control("String", () => cy.get("input").eq(0).type("Hello"));
    cy.contains("Add String").click();
    next = compareJson({ ...next, stringArray: ["Hello", null] });
    control("String", () => cy.contains("button", "Remove").eq(0).click());

    next = compareJson({ ...next, stringArray: [null] });
    control("Choice", () => cy.get("select").should("be.disabled"));

    clickLabel("Can choose?");
    control("Choice", () => cy.get("select").select("This is cool"));
    next = compareJson({ ...next, choice: "Cool" });

    clickLabel("Can choose?");
    const { choice, ...others } = next;
    next = compareJson(others);

    clickLabel("Can choose?");
    next = compareJson({ ...next, choice: "Cool" });

    control("Jsonata control", () => cy.contains("b", "Jsonata value: 2.5"));

    control("Double", () => cy.get("input").clear().type("1.56"));

    control("Jsonata control", () => cy.contains("b", "Jsonata value: 1.56"));

    control("Multiline textfield", () =>
      cy.get("code").type("This\nis\nsome multi"),
    );

    control(/^Date$/, () => cy.get("input").type("1980-04-22"));
    next = compareJson({
      ...next,
      double: 1.56,
      multiline: "This\nis\nsome multi",
      date: "1980-04-22",
    });

    control("Date Time", () => cy.get("input").type("1980-04-22T01:01:01"));
    control(/^Time$/, () => cy.get("input").type("14:00:00"));
    next = compareJson({
      ...next,
      dateTime: "1980-04-22T01:01:01",
      time: "14:00:00",
    });

    clickLabel(/^Sucks$/);
    next = compareJson({
      ...next,
      radioChoice: "Uncool",
    });
    clickLabel(/^Bad Choice$/);
    clickLabel(/^Correct Choice$/);
    next = compareJson({
      ...next,
      multiChoice: [2, 1],
    });
    clickLabel(/^Bad Choice$/);
    next = compareJson({
      ...next,
      multiChoice: [1],
    });
    clickLabel("Hide Date");
    control(/^Date$/, () => cy.get("input").should("be.hidden"));
  });
});
