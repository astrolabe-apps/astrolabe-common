import { describe, expect, it } from "@jest/globals";
import { shouldIgnoreRowClick } from "../src";

/**
 * A row wrapper containing a plain cell and a cell with interactive content,
 * shaped like what a renderer's `wrapBodyRow` produces.
 */
function row() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="cell"><span id="text">notes</span></div>
    <div class="cell"><label id="label"><input id="checkbox" type="checkbox"/></label></div>
    <div class="cell"><a id="link" href="#">open</a></div>
    <div class="cell"><span id="fakebutton" role="button">menu</span></div>
  `;
  document.body.appendChild(wrapper);
  return wrapper;
}

function clickOn(wrapper: HTMLElement, id: string) {
  return shouldIgnoreRowClick({
    target: wrapper.querySelector(`#${id}`),
    currentTarget: wrapper,
  });
}

describe("shouldIgnoreRowClick", () => {
  it("lets a click on plain cell content through", () => {
    expect(clickOn(row(), "text")).toBe(false);
  });

  it("ignores a click on a checkbox", () => {
    expect(clickOn(row(), "checkbox")).toBe(true);
  });

  it("ignores a click on a label wrapping a control", () => {
    // Clicking the label fires the control's click too; without this the row
    // handler and the checkbox would fight and cancel out.
    expect(clickOn(row(), "label")).toBe(true);
  });

  it("ignores a click on a link", () => {
    expect(clickOn(row(), "link")).toBe(true);
  });

  it("ignores a click on something with an interactive role", () => {
    expect(clickOn(row(), "fakebutton")).toBe(true);
  });

  it("ignores a click on content nested inside interactive content", () => {
    const wrapper = row();
    const inner = document.createElement("span");
    wrapper.querySelector("#link")!.appendChild(inner);
    expect(
      shouldIgnoreRowClick({ target: inner, currentTarget: wrapper }),
    ).toBe(true);
  });

  it("ignores the click that ends a text drag inside the row", () => {
    const wrapper = row();
    const text = wrapper.querySelector("#text")!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      expect(clickOn(wrapper, "text")).toBe(true);
    } finally {
      selection.removeAllRanges();
    }
  });

  it("does not count a text selection outside the row", () => {
    const outside = document.createElement("p");
    outside.textContent = "elsewhere";
    document.body.appendChild(outside);
    const wrapper = row();
    const range = document.createRange();
    range.selectNodeContents(outside);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      expect(clickOn(wrapper, "text")).toBe(false);
    } finally {
      selection.removeAllRanges();
    }
  });

  it("does not count a collapsed selection", () => {
    // A plain click leaves a collapsed selection at the click point, which is not
    // the user reading.
    const wrapper = row();
    const text = wrapper.querySelector("#text")!;
    const range = document.createRange();
    range.setStart(text.firstChild!, 2);
    range.collapse(true);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      expect(clickOn(wrapper, "text")).toBe(false);
    } finally {
      selection.removeAllRanges();
    }
  });

  it("survives a missing target", () => {
    expect(
      shouldIgnoreRowClick({ target: null, currentTarget: row() }),
    ).toBe(false);
  });
});
