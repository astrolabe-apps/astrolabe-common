describe("template spec", () => {
  it("passes", () => {
    cy.visit("http://localhost:5173");
    cy.get(".location").type("Hobart");
    cy.get("label").contains("I confirm that").click();
    cy.get("label").contains("No");
    cy.get("label").contains("I confirm that").click();
    cy.get("div").contains(
      "Please acknowledge that you have the appropiate permissions to undertake your burning activity",
    );
    cy.get(".location").click();
    cy.get("label").contains("I confirm that").click();
    cy.get("label").contains("No").click();
    cy.get("label").contains("Location State").type("no_restriction");
    cy.get("label").contains("Intended Burn Date").click().type("2025-01-01");
    cy.get("div").contains("You cannot register a burn more than");
  });
});
