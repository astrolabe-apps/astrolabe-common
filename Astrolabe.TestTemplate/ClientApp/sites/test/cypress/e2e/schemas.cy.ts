import { compareJson, clickLabel } from "./utils";

describe("schemas properties", () => {
  it("passes", () => {
    cy.visit("http://localhost:5173/schemas");
    cy.get("pre#control").should(
      compareJson({
        compound: { intField: 1, choice: "Cool" },
        text: "text",
        double: 1,
        compoundArray: [],
      }),
    );
    cy.get("pre#control2").should(
      compareJson({
        compound: { choice: "Cool" },
        text: "text",
        double: 1,
        compoundArray: [],
      }),
    );
    cy.get("pre#cleaned").should(
      compareJson({
        compound: { intField: 1 },
        compoundArray: [],
      }),
    );
    cy.get("pre#visitedNode").should(
      compareJson([
        "compound",
        "compound.another",
        1,
        "compound",
        "compound.choice",
        null,
        "type",
        "hai",
        "text",
        "TEXT",
        "double",
        1.5,
        "int",
        56,
        "compoundArray",
        "compoundArray[0]",
        "compoundArray[0].choice",
        null,
        "compoundArray[0].another",
        45,
      ]),
    );
    cy.get("pre#dataForVisit").should(
      compareJson({
        type: "hai",
        text: "TEXT",
        compound: { another: 1 },
        int: 56,
        double: 1.5,
        compoundArray: [{ another: 45 }],
      }),
    );
    cy.get("pre#definition").should(
      compareJson([
        {
          type: "Data",
          field: "compound",
          children: [
            {
              type: "Data",
              title: "Int",
              field: "another",
              renderOptions: { type: "Standard" },
            },
          ],
        },
        {
          type: "Data",
          field: "compound",
          title: "Secondary",
          children: [
            {
              type: "Data",
              title: "Choice",
              field: "choice",
              required: true,
              renderOptions: { type: "Standard" },
            },
          ],
        },
        {
          type: "Data",
          title: "Type",
          field: "type",
          renderOptions: { type: "Standard" },
        },
        {
          type: "Data",
          title: "Text",
          field: "text",
          renderOptions: { type: "Standard" },
        },
        {
          type: "Data",
          title: "Double",
          field: "double",
          renderOptions: { type: "Standard" },
        },
        {
          type: "Data",
          title: "Int",
          field: "int",
          renderOptions: { type: "Standard" },
        },
        {
          type: "Data",
          title: "Compound Array",
          field: "compoundArray",
          children: [
            {
              type: "Data",
              title: "Choice",
              field: "choice",
              required: true,
              renderOptions: { type: "Standard" },
            },
            {
              type: "Data",
              title: "Int",
              field: "another",
              renderOptions: { type: "Standard" },
            },
          ],
        },
      ]),
    );
  });
});
