import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, cleanup, render } from "@testing-library/react";
import * as React from "react";
import { newControl, useComponentTracking } from "@react-typed-forms/core";
import { columnDefinitions } from "@astroapps/datagrid";
import {
  defaultSearchOptions,
  getPageOfResults,
  makeClientSortAndFilter,
  type SearchOptions,
} from "@astroapps/searchstate";
import {
  columnSearching,
  makeGridData,
  useClientData,
  useDebouncedSearchOptions,
  type GridData,
  type GridPage,
} from "../src";

interface Row {
  file: string;
  kind: string;
  size: number;
}

const allRows: Row[] = [
  { file: "notes", kind: "doc", size: 3 },
  { file: "logo", kind: "img", size: 1 },
  { file: "readme", kind: "doc", size: 2 },
  { file: "banner", kind: "img", size: 4 },
];

const columns = columnDefinitions<Row>(
  { title: "File", getter: (r) => r.file, sortField: "file" },
  { title: "Kind", getter: (r) => r.kind, filterField: "kind" },
  { title: "Size", getter: (r) => r.size, sortField: "size" },
);

function stateWith(over: Partial<SearchOptions> = {}) {
  return newControl<SearchOptions>({
    ...defaultSearchOptions,
    length: 2,
    ...over,
  });
}

/**
 * Wraps a render function in control tracking.
 *
 * The package's own sources get this from `@react-typed-forms/transform` via
 * `.babelrc`, but this file is compiled by ts-jest, which doesn't apply it.
 * `useComponentTracking` is exactly what the transform injects, so doing it by
 * hand keeps these tests on the real code path rather than a shimmed one.
 */
function tracked(render: () => void) {
  const stop = useComponentTracking();
  try {
    render();
  } finally {
    stop();
  }
}

/** Renders a hook and exposes its latest result. */
function renderData<T>(useData: () => GridData<T>) {
  const seen: { current: GridData<T> } = { current: undefined as any };
  function Probe() {
    tracked(() => {
      seen.current = useData();
    });
    return null;
  }
  const rendered = render(<Probe />);
  return { seen, rerender: () => rendered.rerender(<Probe />) };
}

/**
 * One page of results as a server would return it — the shape a react-query
 * `queryFn` produces and hands to `makeGridData`. Sync, because the search itself
 * is what's under test here, not the fetching around it.
 */
function searchPage(options: SearchOptions, rows: Row[] = allRows): GridPage<Row> {
  const searched = makeClientSortAndFilter(columnSearching(columns))(
    options,
    rows,
  );
  return {
    rows: getPageOfResults(options.offset, options.length, searched),
    total: searched.length,
  };
}

/** Compares the parts a renderer actually consumes. */
function snapshot<T>(data: GridData<T>) {
  return {
    rows: data.rows,
    total: data.total,
    bodyRows: data.rowProps.bodyRows,
    firstRow: data.rowProps.bodyRows ? data.rowProps.getBodyRow(0) : undefined,
  };
}

afterEach(cleanup);

describe("useClientData", () => {
  it("sorts, filters, queries and pages", async () => {
    const state = stateWith({ sort: ["dsize"], filters: { kind: ["doc"] } });
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns }),
    );
    expect(seen.current.rows.map((r) => r.file)).toEqual(["notes", "readme"]);
    expect(seen.current.total).toBe(2);
  });

  it("reports the filtered total, not the page length", async () => {
    const state = stateWith({ length: 2 });
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns }),
    );
    expect(seen.current.rows).toHaveLength(2);
    expect(seen.current.total).toBe(4);
  });

  it("honours length by default, unlike the old FluentDataTable", async () => {
    const state = stateWith({ length: 3 });
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns }),
    );
    expect(seen.current.rows).toHaveLength(3);
  });

  it("returns every row when paging is off", async () => {
    const state = stateWith({ length: 2 });
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns, paged: false }),
    );
    expect(seen.current.rows).toHaveLength(4);
  });

  it("follows offset", async () => {
    const state = stateWith({ length: 2, offset: 2, sort: ["afile"] });
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns }),
    );
    expect(seen.current.rows.map((r) => r.file)).toEqual(["notes", "readme"]);
  });

  it("reacts to a state change", async () => {
    const state = stateWith({ length: 10 });
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns }),
    );
    expect(seen.current.total).toBe(4);
    await act(async () => {
      state.fields.filters.value = { kind: ["img"] };
    });
    expect(seen.current.rows.map((r) => r.file)).toEqual(["logo", "banner"]);
    expect(seen.current.total).toBe(2);
  });

  it("ignores a filter for a field with no column", async () => {
    // A stale filter in a URL shouldn't empty the grid.
    const state = stateWith({ length: 10, filters: { ghost: ["x"] } });
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns }),
    );
    expect(seen.current.total).toBe(4);
  });

  it("applies a custom matches predicate", async () => {
    // The path searchstate's makeFilterFunc can't express.
    const state = stateWith({ length: 10, filters: { big: [">2"] } });
    const { seen } = renderData(() =>
      useClientData(state, {
        rows: allRows,
        columns,
        getColumnFilter: (c) =>
          c.title === "Size"
            ? {
                field: "big",
                matches: (row, values) =>
                  values.every((v) => row.size > Number(v.slice(1))),
              }
            : undefined,
      }),
    );
    expect(seen.current.rows.map((r) => r.file)).toEqual(["notes", "banner"]);
  });

  it("excludes a field's own filter from its option rows", async () => {
    // Excel behaviour: having picked "doc", the Kind popover must still offer
    // "img", or the selection can never be changed.
    const state = stateWith({ length: 10, filters: { kind: ["doc"] } });
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns }),
    );
    expect(seen.current.rows).toHaveLength(2);
    expect(seen.current.optionRows!("kind")).toHaveLength(4);
  });

  it("still applies other columns' filters to option rows", async () => {
    const state = stateWith({
      length: 10,
      query: "o",
      filters: { kind: ["doc"] },
    });
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns }),
    );
    // Query "o" matches notes and logo by filename, and readme through its kind
    // "doc" — every value column feeds the search text. "banner"/"img" has no o.
    // The kind filter itself is excluded, so "logo" (an img) survives.
    expect(seen.current.optionRows!("kind").map((r) => r.file)).toEqual([
      "notes",
      "logo",
      "readme",
    ]);
  });

  it("keeps a column's own filter when told to", async () => {
    const state = stateWith({ length: 10, filters: { kind: ["doc"] } });
    const { seen } = renderData(() =>
      useClientData(state, {
        rows: allRows,
        columns,
        optionsIgnoreOwnFilter: false,
      }),
    );
    expect(seen.current.optionRows!("kind")).toHaveLength(2);
  });

  it("passes loading through and has a no-op reload", async () => {
    const state = stateWith();
    const { seen } = renderData(() =>
      useClientData(state, { rows: allRows, columns, loading: true }),
    );
    expect(seen.current.loading).toBe(true);
    expect(() => seen.current.reload()).not.toThrow();
  });

  it("keeps a referentially stable result across renders with no change", async () => {
    const state = stateWith();
    const { seen, rerender } = renderData(() =>
      useClientData(state, { rows: allRows, columns }),
    );
    const first = seen.current;
    rerender();
    expect(seen.current).toBe(first);
  });
});

describe("state that extends SearchOptions", () => {
  // The common case: filtering that isn't a column filter — a date range, a
  // tenant, a "show archived" toggle — living in fields the app added.
  interface Extended extends SearchOptions {
    archived: boolean;
  }

  function extendedState(over: Partial<Extended> = {}) {
    return newControl<Extended>({
      ...defaultSearchOptions,
      length: 10,
      archived: false,
      ...over,
    });
  }

  it("applies out-of-grid filtering client-side via additionalFilter", async () => {
    // Client-side can't know what an extra field means, so the caller says.
    const state = extendedState({ archived: true });
    const { seen } = renderData(() =>
      useClientData(state, {
        rows: allRows,
        columns,
        additionalFilter: (row) =>
          state.fields.archived.value ? row.kind === "doc" : true,
      }),
    );
    expect(seen.current.rows.map((r) => r.file)).toEqual(["notes", "readme"]);
    expect(seen.current.total).toBe(2);
  });

  it("combines additionalFilter with column filters and the query", async () => {
    const state = extendedState({ query: "e", filters: { kind: ["doc"] } });
    const { seen } = renderData(() =>
      useClientData(state, {
        rows: allRows,
        columns,
        additionalFilter: (row) => row.size > 2,
      }),
    );
    // kind=doc → notes, readme; query "e" keeps both; size > 2 leaves notes.
    expect(seen.current.rows.map((r) => r.file)).toEqual(["notes"]);
  });
});

describe("client and server agree", () => {
  // The headline claim of the redesign: swapping the data source changes nothing
  // the renderer can see. Client-side is `useClientData`; server-side is a fetched
  // page mapped through `makeGridData` — what a react-query `queryFn` produces.
  const searches: [string, Partial<SearchOptions>][] = [
    ["defaults", {}],
    ["a sort", { sort: ["dsize"] }],
    ["a filter", { filters: { kind: ["doc"] } }],
    ["a query", { query: "o" }],
    ["a second page", { offset: 2 }],
    [
      "everything at once",
      { sort: ["afile"], filters: { kind: ["img"] }, query: "o" },
    ],
  ];

  it.each(searches)("produce identical GridData for %s", (_label, over) => {
    const client = renderData(() =>
      useClientData(stateWith(over), { rows: allRows, columns }),
    );
    const clientSnapshot = snapshot(client.seen.current);
    cleanup();

    const server = makeGridData<Row>({
      page: searchPage({ ...defaultSearchOptions, length: 2, ...over }),
      loading: false,
    });

    expect(snapshot(server)).toEqual(clientSnapshot);
  });
});

describe("makeGridData", () => {
  it("builds rowProps and picks up facets", () => {
    const data = makeGridData<Row>({
      page: {
        rows: [allRows[0]],
        total: 9,
        facets: { kind: [{ value: "doc", count: 2 }] },
      },
      loading: true,
      reload: () => {},
    });
    expect(data.rowProps.bodyRows).toBe(1);
    expect(data.rowProps.getBodyRow(0).file).toBe("notes");
    expect(data.total).toBe(9);
    expect(data.loading).toBe(true);
    expect(data.facets!.kind).toHaveLength(1);
  });

  it("copes with no page yet", () => {
    const data = makeGridData<Row>({ page: undefined });
    expect(data.rows).toEqual([]);
    expect(data.total).toBeUndefined();
    expect(data.loading).toBe(false);
    expect(() => data.reload()).not.toThrow();
  });

  it("passes an absent total through as undefined, not 0", () => {
    // 0 would tell a pager the grid is empty; undefined says "not counted".
    const data = makeGridData<Row>({ page: { rows: allRows } });
    expect(data.total).toBeUndefined();
    expect(data.rows).toHaveLength(4);
  });

});

/** Renders `useDebouncedSearchOptions` and exposes its latest returned value. */
function renderDebounced(state: ReturnType<typeof stateWith>, ms: number) {
  const seen: { current: SearchOptions } = { current: undefined as any };
  function Probe() {
    tracked(() => {
      seen.current = useDebouncedSearchOptions(state, ms);
    });
    return null;
  }
  render(<Probe />);
  return seen;
}

describe("useDebouncedSearchOptions", () => {
  it("delays query but passes sort straight through", async () => {
    jest.useFakeTimers();
    try {
      const state = stateWith();
      const seen = renderDebounced(state, 300);
      expect(seen.current.query).toBe("");
      expect(seen.current.sort).toEqual([]);

      // Sort is immediate.
      await act(async () => {
        state.fields.sort.value = ["afile"];
      });
      expect(seen.current.sort).toEqual(["afile"]);

      // Query waits for the debounce.
      await act(async () => {
        state.fields.query.value = "n";
      });
      expect(seen.current.query).toBe("");
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(seen.current.query).toBe("n");
    } finally {
      jest.useRealTimers();
    }
  });

  it("collapses a burst of keystrokes into one settled value", async () => {
    jest.useFakeTimers();
    try {
      const state = stateWith();
      const seen = renderDebounced(state, 300);

      // Each keystroke lands 100ms apart and resets the 300ms timer, so nothing
      // settles mid-burst.
      for (const q of ["n", "no", "not", "note"]) {
        await act(async () => {
          state.fields.query.value = q;
          jest.advanceTimersByTime(100);
        });
      }
      expect(seen.current.query).toBe("");

      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(seen.current.query).toBe("note");
    } finally {
      jest.useRealTimers();
    }
  });
});
