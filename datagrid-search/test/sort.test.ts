import { describe, expect, it } from "@jest/globals";
import { newControl } from "@react-typed-forms/core";
import {
  columnDefinitions,
  type ColumnDef,
  type SortDirection,
} from "@astroapps/datagrid";
import {
  defaultSearchOptions,
  type SearchOptions,
} from "@astroapps/searchstate";
import { applySortField, makeGridSort, nextSortDirection } from "../src";

interface Row {
  file: string;
  size: number;
}

const columns = columnDefinitions<Row>(
  { title: "File", getter: (r) => r.file, sortField: "file" },
  {
    title: "Size",
    getter: (r) => r.size,
    sortField: "size",
    defaultSort: "desc",
  },
  { title: "Actions", render: () => null },
);
const [file, size, actions] = columns;

function stateWith(over: Partial<SearchOptions> = {}) {
  return newControl<SearchOptions>({ ...defaultSearchOptions, ...over });
}

describe("nextSortDirection", () => {
  const cases: [
    SortDirection | undefined,
    SortDirection,
    boolean,
    SortDirection | undefined,
  ][] = [
    // unsorted always goes to the column's default
    [undefined, "asc", false, "asc"],
    [undefined, "desc", false, "desc"],
    // default flips to its reverse
    ["asc", "asc", false, "desc"],
    ["desc", "desc", false, "asc"],
    // back at the start: two-state cycle returns to the default...
    ["desc", "asc", false, "asc"],
    ["asc", "desc", false, "desc"],
    // ...and three-state drops the sort
    ["desc", "asc", true, undefined],
    ["asc", "desc", true, undefined],
  ];

  it.each(cases)(
    "current=%s default=%s cycleUnsorted=%s -> %s",
    (current, defaultSort, cycleUnsorted, expected) => {
      expect(nextSortDirection(current, defaultSort, cycleUnsorted)).toBe(
        expected,
      );
    },
  );
});

describe("applySortField", () => {
  it("replaces everything in single mode", () => {
    expect(applySortField(["asize"], "file", "asc", false)).toEqual(["afile"]);
  });

  it("clears in single mode when unsorted", () => {
    expect(applySortField(["afile"], "file", undefined, false)).toEqual([]);
  });

  it("appends a new field as least significant in multiple mode", () => {
    expect(applySortField(["afile"], "size", "desc", true)).toEqual([
      "afile",
      "dsize",
    ]);
  });

  it("keeps precedence when changing an existing field's direction", () => {
    // The point: 'file' must stay primary rather than jumping to the front or
    // silently reordering 'size'.
    expect(applySortField(["afile", "dsize"], "file", "desc", true)).toEqual([
      "dfile",
      "dsize",
    ]);
  });

  it("removes just that field in multiple mode", () => {
    expect(applySortField(["afile", "dsize"], "file", undefined, true)).toEqual(
      ["dsize"],
    );
  });
});

describe("makeGridSort", () => {
  it("reports sortability from sortField", () => {
    const sort = makeGridSort(stateWith());
    expect(sort.isSortable(file)).toBe(true);
    expect(sort.isSortable(actions)).toBe(false);
  });

  it("reads direction from the state", () => {
    const sort = makeGridSort(stateWith({ sort: ["dfile"] }));
    expect(sort.direction(file)).toBe("desc");
    expect(sort.direction(size)).toBeUndefined();
  });

  it("cycles a column through its default direction first", () => {
    const state = stateWith();
    makeGridSort(state).toggle(file);
    expect(state.fields.sort.value).toEqual(["afile"]);
    // A fresh GridSort each time, since it reads .value when built — that's how
    // it behaves across renders.
    makeGridSort(state).toggle(file);
    expect(state.fields.sort.value).toEqual(["dfile"]);
    makeGridSort(state).toggle(file);
    expect(state.fields.sort.value).toEqual(["afile"]);
  });

  it("honours a column's defaultSort of desc", () => {
    const state = stateWith();
    makeGridSort(state).toggle(size);
    expect(state.fields.sort.value).toEqual(["dsize"]);
  });

  it("drops the sort on the third click when cycleUnsorted", () => {
    const state = stateWith();
    const opts = { cycleUnsorted: true };
    makeGridSort(state, opts).toggle(file);
    makeGridSort(state, opts).toggle(file);
    makeGridSort(state, opts).toggle(file);
    expect(state.fields.sort.value).toEqual([]);
  });

  it("replaces the sort in single mode", () => {
    const state = stateWith({ sort: ["afile"] });
    makeGridSort(state).toggle(size);
    expect(state.fields.sort.value).toEqual(["dsize"]);
  });

  it("accumulates in multiple mode", () => {
    const state = stateWith({ sort: ["afile"] });
    makeGridSort(state, { mode: "multiple" }).toggle(size);
    expect(state.fields.sort.value).toEqual(["afile", "dsize"]);
  });

  it("adds only on shift-click in shift mode", () => {
    const state = stateWith({ sort: ["afile"] });
    makeGridSort(state, { mode: "shift" }).toggle(size, { shiftKey: true });
    expect(state.fields.sort.value).toEqual(["afile", "dsize"]);

    makeGridSort(state, { mode: "shift" }).toggle(file);
    expect(state.fields.sort.value).toEqual(["dfile"]);
  });

  it("reports priority only when more than one column is sorted", () => {
    const one = makeGridSort(stateWith({ sort: ["afile"] }), {
      mode: "multiple",
    });
    expect(one.priority(file)).toBeUndefined();

    const two = makeGridSort(stateWith({ sort: ["afile", "dsize"] }), {
      mode: "multiple",
    });
    expect(two.priority(file)).toBe(1);
    expect(two.priority(size)).toBe(2);
    expect(two.priority(actions)).toBeUndefined();
  });

  it("never reports priority in single mode", () => {
    const sort = makeGridSort(stateWith({ sort: ["afile", "dsize"] }));
    expect(sort.priority(file)).toBeUndefined();
  });

  it("resets paging when the sort changes", () => {
    const state = stateWith({ offset: 40 });
    makeGridSort(state).toggle(file);
    expect(state.fields.offset.value).toBe(0);
  });

  it("leaves paging alone when told to", () => {
    const state = stateWith({ offset: 40 });
    makeGridSort(state, { resetPaging: false }).toggle(file);
    expect(state.fields.offset.value).toBe(40);
  });

  it("ignores a click on an unsortable column", () => {
    const state = stateWith({ offset: 40 });
    makeGridSort(state).toggle(actions);
    expect(state.fields.sort.value).toEqual([]);
    expect(state.fields.offset.value).toBe(40);
  });
});

describe("makeGridSort with a hydrated sort", () => {
  it("matches a field whose entry came from a URL", () => {
    // The encoding is the contract with searchstate and the URL, so a
    // hand-written entry has to resolve.
    const sort = makeGridSort(stateWith({ sort: ["dsize", "afile"] }), {
      mode: "multiple",
    });
    expect(sort.direction(size)).toBe("desc");
    expect(sort.priority(size)).toBe(1);
    expect(sort.priority(file)).toBe(2);
  });

  it("tolerates a sort entry for a field with no column", () => {
    const sort = makeGridSort(stateWith({ sort: ["aghost"] }));
    expect(sort.direction(file)).toBeUndefined();
    expect(() => sort.direction({} as ColumnDef<Row, unknown>)).not.toThrow();
  });
});
