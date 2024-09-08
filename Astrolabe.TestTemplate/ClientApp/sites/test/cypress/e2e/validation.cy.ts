import { compareJson as cj, control, clickLabel } from "./utils";
import { addDays, formatDate, formatISO } from "date-fns";

function compareJson(compare: any): any {
  cy.get("pre").then(cj(compare));
  return compare;
}
const today = new Date();

describe("all controls", () => {
  it("passes", () => {
    cy.visit("http://localhost:5173/validation");

    let next = compareJson({ text: "", stringArray: [null, null] });

    control("Text", () => cy.get("input").type("Min"));
    cy.get("pre").click();
    control("Text", () => cy.get("input").type("imum"));
    control("Text", () =>
      cy.contains("div", "Length must be at least 5").should("not.exist"),
    );
    control("Text", () => cy.get("input").type(" now we've gone to far"));
    control("Text", () => cy.contains("div", "Length must be less than 15"));

    control("Text Required", () => cy.get("input").clear());
    cy.get("pre").click();
    control("Text Required", () => cy.contains("div", "Please enter a value"));

    control("Not before today", () => cy.get("input").type("1980-04-22"));
    cy.get("pre").click();
    control("Not before today", () =>
      cy.contains("div", "Date must not be before"),
    );
    control("Not before today", () =>
      cy.get("input").type(formatISO(today, { representation: "date" })),
    );
    control("Not before today", () =>
      cy.contains("div", "Date must not be before").should("not.exist"),
    );

    control("Not after tomorrow", () =>
      cy
        .get("input")
        .type(formatISO(addDays(today, 2), { representation: "date" })),
    );
    cy.get("pre").click();
    control("Not after tomorrow", () =>
      cy.contains("div", "Date must not be after"),
    );
    control("Not after tomorrow", () =>
      cy
        .get("input")
        .type(formatISO(addDays(today, 1), { representation: "date" })),
    );
    control("Not after tomorrow", () =>
      cy.contains("div", "Date must not be after").should("not.exist"),
    );

    control("Date Time Not Before", () =>
      cy.get("input").type("1980-04-21T00:00:10"),
    );
    cy.get("pre").click();
    control("Date Time Not Before", () =>
      cy.contains("div", "Date must not be before"),
    );

    control("String Array", () => {
      cy.contains("button", "Remove").should("not.exist");
      cy.contains("button", "Add String Array").click();
      cy.get("button").eq(2).click();
      cy.contains("button", "Add String Array").click();
      cy.contains("button", "Add String Array").click();
      cy.contains("button", "Add String Array").should("not.exist");
    });

    next = compareJson({
      ...next,
      text: "Minimum now we've gone to far",
      stringArray: [null, null, null, null],
      notBeforeDate: "2024-09-07",
      notAfterDate: "2024-09-08",
      dateTime: "1980-04-21T00:00:10",
    });

    control("String Array", () => {
      cy.contains("Jsonata says no").should("not.exist");
    });
    cy.get("#forceTouched").click();
    control("String Array", () => {
      cy.contains("Jsonata says no");
    });

    control("Text", () => cy.get("input").clear().type("Please"));
    control("String Array", () => {
      cy.contains("Jsonata says no").should("not.exist");
    });
  });
});
