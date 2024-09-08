export function compareJson(compare: any): (jq: JQuery) => void {
  return (jq) => {
    expect(JSON.parse(jq[0].textContent!)).to.deep.equal(compare);
  };
}

export function control(label: string | number | RegExp, withIn: () => any) {
  return cy.contains("div label", label).parent().within(withIn);
}

export function clickLabel(label: string | number | RegExp) {
  return cy.contains("label", label).click();
}
