import { describe, expect, it } from "@jest/globals";
import { newControl } from "@react-typed-forms/core";
import { arraySelection, makeGridSelection } from "../src";

interface Row {
  id: string;
}

const page1: Row[] = [{ id: "a" }, { id: "b" }, { id: "c" }];
const page2: Row[] = [{ id: "d" }, { id: "e" }, { id: "f" }];
const getId = (r: Row) => r.id;

function selection(rows: Row[], selectedIds: string[]) {
  const changes: string[][] = [];
  return {
    changes,
    sel: arraySelection({
      rows,
      getId,
      selectedIds,
      onChange: (ids) => changes.push(ids),
    }),
  };
}

describe("arraySelection", () => {
  it("reports individual rows", () => {
    const { sel } = selection(page1, ["b"]);
    expect(sel.isSelected(page1[0])).toBe(false);
    expect(sel.isSelected(page1[1])).toBe(true);
  });

  it("toggles a row on and off", () => {
    const { sel, changes } = selection(page1, ["b"]);
    sel.toggle(page1[0]);
    expect(changes[0]).toEqual(["b", "a"]);

    const off = selection(page1, ["a", "b"]);
    off.sel.toggle(page1[0]);
    expect(off.changes[0]).toEqual(["b"]);
  });

  it("honours an explicit on/off", () => {
    const { sel, changes } = selection(page1, ["a"]);
    sel.toggle(page1[0], true);
    // Already selected, so nothing to do.
    expect(changes).toHaveLength(0);
    sel.toggle(page1[0], false);
    expect(changes[0]).toEqual([]);
  });

  it("is all-selected only when the whole page is", () => {
    expect(selection(page1, ["a", "b"]).sel.allSelected).toBe(false);
    expect(selection(page1, ["a", "b", "c"]).sel.allSelected).toBe(true);
  });

  it("is not all-selected for an empty page", () => {
    expect(selection([], ["a"]).sel.allSelected).toBe(false);
  });

  it("reports the mixed state", () => {
    expect(selection(page1, ["a"]).sel.someSelected).toBe(true);
    expect(selection(page1, []).sel.someSelected).toBe(false);
    expect(selection(page1, ["a", "b", "c"]).sel.someSelected).toBe(false);
  });

  it("selects the whole page, keeping other pages", () => {
    const { sel, changes } = selection(page1, ["d"]);
    sel.toggleAll();
    expect(changes[0]).toEqual(["d", "a", "b", "c"]);
  });

  it("clears only this page when the page is fully selected", () => {
    const { sel, changes } = selection(page1, ["a", "b", "c", "d"]);
    sel.toggleAll();
    expect(changes[0]).toEqual(["d"]);
  });

  it("does not re-add rows already selected when selecting the page", () => {
    const { sel, changes } = selection(page1, ["b"]);
    sel.toggleAll();
    expect(changes[0]).toEqual(["b", "a", "c"]);
  });
});

describe("page scoping (the bug this replaced)", () => {
  // The previous implementation compared the *total* selected count against the
  // *current page's* row count: `selectedIds.length >= rows.length`. So selecting
  // three rows on page 1 then paging to another three-row page reported the header
  // checkbox as checked with nothing on that page selected — and clicking it wiped
  // the earlier selection.
  const selectedOnPage1 = ["a", "b", "c"];

  it("shows an unchecked header on a page with nothing selected", () => {
    const { sel } = selection(page2, selectedOnPage1);
    expect(sel.allSelected).toBe(false);
    expect(sel.someSelected).toBe(false);
  });

  it("adds to the selection rather than replacing it", () => {
    const { sel, changes } = selection(page2, selectedOnPage1);
    sel.toggleAll();
    expect(changes[0]).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("keeps page 1 selected when clearing page 2", () => {
    const { sel, changes } = selection(page2, [
      ...selectedOnPage1,
      ...["d", "e", "f"],
    ]);
    expect(sel.allSelected).toBe(true);
    sel.toggleAll();
    expect(changes[0]).toEqual(selectedOnPage1);
  });
});

describe("makeGridSelection", () => {
  it("reads and writes a Control<string[]>", () => {
    const selected = newControl<string[]>(["b"]);
    const sel = makeGridSelection({ selected, rows: page1, getId });
    expect(sel.isSelected(page1[1])).toBe(true);
    sel.toggle(page1[0]);
    expect(selected.value).toEqual(["b", "a"]);
  });

  it("copes with a null-ish initial value", () => {
    const selected = newControl<string[]>(undefined as unknown as string[]);
    const sel = makeGridSelection({ selected, rows: page1, getId });
    expect(sel.someSelected).toBe(false);
    sel.toggleAll();
    expect(selected.value).toEqual(["a", "b", "c"]);
  });
});
