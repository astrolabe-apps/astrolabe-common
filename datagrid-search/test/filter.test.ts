import { describe, expect, it } from "@jest/globals";
import { newControl } from "@react-typed-forms/core";
import { columnDefinitions } from "@astroapps/datagrid";
import {
  defaultSearchOptions,
  type SearchOptions,
} from "@astroapps/searchstate";
import {
  byFilterField,
  columnFilterResolver,
  columnMatcher,
  defaultGetColumnFilter,
  filterFieldOf,
  makeGridFilter,
  type ColumnFilter,
  type GetColumnFilter,
} from "../src";

interface Row {
  file: string;
  kind: string;
  size: number;
}

const columns = columnDefinitions<Row>(
  { title: "File", getter: (r) => r.file },
  { title: "Kind", getter: (r) => r.kind, filterField: "kind" },
  { id: "size", title: "Size", getter: (r) => r.size, filterField: "size" },
);
const [file, kind, size] = columns;

function stateWith(over: Partial<SearchOptions> = {}) {
  return newControl<SearchOptions>({ ...defaultSearchOptions, ...over });
}

describe("defaultGetColumnFilter", () => {
  it("makes a column filterable exactly when it has a filterField", () => {
    expect(defaultGetColumnFilter(kind)).toEqual({});
    expect(defaultGetColumnFilter(file)).toBeUndefined();
  });
});

describe("byFilterField", () => {
  it("looks config up by filter field", () => {
    const get = byFilterField<Row>({ kind: { multiple: false } });
    expect(get(kind)).toEqual({ multiple: false });
    expect(get(size)).toBeUndefined();
  });
});

describe("filterFieldOf", () => {
  it("prefers an explicit field, then filterField, then id", () => {
    expect(filterFieldOf(kind, { field: "custom" })).toBe("custom");
    expect(filterFieldOf(kind, {})).toBe("kind");
    expect(filterFieldOf(file, {})).toBe("File");
  });
});

describe("columnFilterResolver", () => {
  it("calls getColumnFilter once per column however often it is asked", () => {
    // The §8 refetch-loop guard: a fresh options array per call would break memo
    // deps downstream, so resolution has to be cached.
    const calls: string[] = [];
    const get: GetColumnFilter<Row> = (c) => {
      calls.push(c.id);
      return c.filterField ? { options: [{ value: "x" }] } : undefined;
    };
    const resolve = columnFilterResolver(columns, get);

    const first = resolve(kind);
    const second = resolve(kind);
    resolve(file);
    resolve(file);

    expect(calls).toEqual(["Kind", "File"]);
    // Same object, so `options` is referentially stable across renders.
    expect(second).toBe(first);
  });

  it("caches a negative result too", () => {
    let calls = 0;
    const resolve = columnFilterResolver(columns, () => {
      calls++;
      return undefined;
    });
    resolve(file);
    resolve(file);
    expect(calls).toBe(1);
  });
});

describe("columnMatcher", () => {
  const rows: Row[] = [
    { file: "a", kind: "doc", size: 1 },
    { file: "b", kind: "img", size: 2 },
  ];

  it("matches the column's filterValue against the selection by default", () => {
    const matches = columnMatcher(kind, {})!;
    expect(matches(rows[0], ["doc"])).toBe(true);
    expect(matches(rows[1], ["doc"])).toBe(false);
  });

  it("derives a filterValue from the getter for numeric columns", () => {
    const matches = columnMatcher(size, {})!;
    expect(matches(rows[1], ["2"])).toBe(true);
  });

  it("prefers an explicit matches", () => {
    const filter: ColumnFilter<Row> = {
      matches: (row, values) => values.some((v) => row.size > Number(v)),
    };
    const matches = columnMatcher(size, filter)!;
    expect(matches(rows[1], ["1"])).toBe(true);
    expect(matches(rows[0], ["1"])).toBe(false);
  });

  it("is undefined for a column with no way to get a value", () => {
    const [render] = columnDefinitions<Row>({ title: "X", render: () => null });
    expect(columnMatcher(render, {})).toBeUndefined();
  });
});

describe("makeGridFilter", () => {
  it("reads selected values", () => {
    const filter = makeGridFilter<Row>(
      stateWith({ filters: { kind: ["doc"] } }),
    );
    expect(filter.values("kind")).toEqual(["doc"]);
    expect(filter.active("kind")).toBe(true);
    expect(filter.active("size")).toBe(false);
  });

  it("returns the stored array itself", () => {
    const filters = { kind: ["doc", "img"] };
    const filter = makeGridFilter<Row>(stateWith({ filters }));
    expect(filter.values("kind")).toBe(filters.kind);
  });

  it("returns [] for a field that was never set", () => {
    const filter = makeGridFilter<Row>(stateWith());
    expect(filter.values("kind")).toEqual([]);
  });

  it("hands out a stable control per field", () => {
    const filter = makeGridFilter<Row>(stateWith());
    expect(filter.selected("kind")).toBe(filter.selected("kind"));
  });

  it("does not add a key just because a field control was read", () => {
    // Reading must not mutate the state — otherwise merely rendering a popover
    // would change a react-query key or a URL.
    const state = stateWith({ filters: { kind: ["doc"] } });
    const filter = makeGridFilter<Row>(state);
    filter.selected("size");
    filter.values("size");
    expect(state.fields.filters.value).toEqual({ kind: ["doc"] });
  });

  it("toggles a value on and off", () => {
    const state = stateWith();
    makeGridFilter<Row>(state).toggle("kind", "doc", true);
    expect(state.fields.filters.value).toEqual({ kind: ["doc"] });

    makeGridFilter<Row>(state).toggle("kind", "img", true);
    expect(state.fields.filters.value).toEqual({ kind: ["doc", "img"] });

    makeGridFilter<Row>(state).toggle("kind", "doc", false);
    expect(state.fields.filters.value).toEqual({ kind: ["img"] });
  });

  it("removes the key entirely when the last value is unselected", () => {
    // Not `{ kind: [] }` — an empty array is a visible difference in a URL and a
    // different react-query key for an identical search.
    const state = stateWith({ filters: { kind: ["doc"] } });
    makeGridFilter<Row>(state).toggle("kind", "doc", false);
    expect(state.fields.filters.value).toEqual({});
    expect("kind" in state.fields.filters.value).toBe(false);
  });

  it("is a no-op when toggling to the state it is already in", () => {
    const state = stateWith({ filters: { kind: ["doc"] } });
    const before = state.fields.filters.value;
    makeGridFilter<Row>(state).toggle("kind", "doc", true);
    expect(state.fields.filters.value).toBe(before);
  });

  it("clears one field and leaves the others", () => {
    const state = stateWith({ filters: { kind: ["doc"], size: ["1"] } });
    makeGridFilter<Row>(state).clear("kind");
    expect(state.fields.filters.value).toEqual({ size: ["1"] });
  });

  it("clears every field when called with no argument", () => {
    const state = stateWith({ filters: { kind: ["doc"], size: ["1"] } });
    makeGridFilter<Row>(state).clear();
    expect(state.fields.filters.value).toEqual({});
  });

  it("lists the fields with a selection", () => {
    const filter = makeGridFilter<Row>(
      stateWith({ filters: { kind: ["doc"], size: [] } }),
    );
    expect(filter.activeFields()).toEqual(["kind"]);
  });

  it("resets paging when a filter changes", () => {
    const state = stateWith({ offset: 40 });
    makeGridFilter<Row>(state).toggle("kind", "doc", true);
    expect(state.fields.offset.value).toBe(0);
  });

  it("does not reset paging for a direct write to the state", () => {
    // The escape hatch for a caller that manages paging itself: only interaction
    // through GridFilter resets, so writing the field directly stays untouched.
    // That's what an out-of-grid filter control does.
    const state = stateWith({ offset: 40 });
    state.fields.filters.value = { kind: ["doc"] };
    expect(state.fields.offset.value).toBe(40);
  });

  it("writes through the per-field control", () => {
    const state = stateWith();
    const filter = makeGridFilter<Row>(state);
    // This is the contract a custom popup relies on.
    filter.selected("size").value = ["1..10"];
    expect(state.fields.filters.value).toEqual({ size: ["1..10"] });
  });

  it("resolves filterability and field through the resolver", () => {
    const filter = makeGridFilter<Row>(stateWith(), {
      filterFor: columnFilterResolver(columns, byFilterField({ kind: {} })),
    });
    expect(filter.isFilterable(kind)).toBe(true);
    expect(filter.isFilterable(size)).toBe(false);
    expect(filter.field(kind)).toBe("kind");
    expect(filter.field(size)).toBeUndefined();
  });
});
