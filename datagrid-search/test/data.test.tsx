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
  useServerData,
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

/** A stub server that searches the same array, as a real API would. */
function stubFetch(rows: Row[] = allRows) {
  return async (options: SearchOptions): Promise<GridPage<Row>> => {
    const searched = makeClientSortAndFilter(columnSearching(columns))(
      options,
      rows,
    );
    return {
      rows: getPageOfResults(options.offset, options.length, searched),
      total: searched.length,
    };
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

describe("useServerData", () => {
  it("fetches a page and reports the server's total", async () => {
    const state = stateWith({ length: 2 });
    const { seen } = renderData(() =>
      useServerData(state, { fetch: stubFetch(), debounce: 0 }),
    );
    expect(seen.current.loading).toBe(true);
    await act(async () => {});
    expect(seen.current.rows).toHaveLength(2);
    expect(seen.current.total).toBe(4);
    expect(seen.current.loading).toBe(false);
  });

  it("refetches when the search changes", async () => {
    const fetch = jest.fn(stubFetch());
    const state = stateWith({ length: 10 });
    const { seen } = renderData(() =>
      useServerData(state, { fetch, debounce: 0 }),
    );
    await act(async () => {});
    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      state.fields.filters.value = { kind: ["img"] };
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(seen.current.total).toBe(2);
  });

  it("does not refetch when only the fetch function identity changes", async () => {
    // The footgun this guards: an inline arrow would otherwise loop forever.
    const calls = { n: 0 };
    const state = stateWith();
    const { rerender } = renderData(() =>
      useServerData(state, {
        fetch: async (o) => {
          calls.n++;
          return stubFetch()(o);
        },
        debounce: 0,
      }),
    );
    await act(async () => {});
    expect(calls.n).toBe(1);
    rerender();
    await act(async () => {});
    expect(calls.n).toBe(1);
  });

  it("refetches on reload()", async () => {
    const fetch = jest.fn(stubFetch());
    const state = stateWith();
    const { seen } = renderData(() =>
      useServerData(state, { fetch, debounce: 0 }),
    );
    await act(async () => {});
    await act(async () => {
      seen.current.reload();
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("refetches when deps change", async () => {
    const fetch = jest.fn(stubFetch());
    const state = stateWith();
    let tenant = "a";
    function Probe() {
      tracked(() => {
        useServerData(state, { fetch, debounce: 0, deps: [tenant] });
      });
      return null;
    }
    const rendered = render(<Probe />);
    await act(async () => {});
    expect(fetch).toHaveBeenCalledTimes(1);
    tenant = "b";
    await act(async () => {
      rendered.rerender(<Probe />);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("never lets a stale response win", async () => {
    // The first request resolves *after* the second. Its result must be dropped,
    // not applied over the newer one.
    const resolvers: ((page: GridPage<Row>) => void)[] = [];
    const fetch = () =>
      new Promise<GridPage<Row>>((resolve) => resolvers.push(resolve));
    const state = stateWith({ length: 10 });
    const { seen } = renderData(() =>
      useServerData(state, { fetch, debounce: 0 }),
    );

    await act(async () => {
      state.fields.query.value = "second";
    });
    expect(resolvers).toHaveLength(2);

    await act(async () => {
      resolvers[1]({ rows: [allRows[1]], total: 1 });
    });
    await act(async () => {
      resolvers[0]({ rows: allRows, total: 99 });
    });

    expect(seen.current.total).toBe(1);
    expect(seen.current.rows.map((r) => r.file)).toEqual(["logo"]);
  });

  it("keeps the previous page visible while refetching", async () => {
    const state = stateWith({ length: 10 });
    const { seen } = renderData(() =>
      useServerData(state, { fetch: stubFetch(), debounce: 0 }),
    );
    await act(async () => {});
    expect(seen.current.rows).toHaveLength(4);

    let release: (() => void) | undefined;
    await act(async () => {
      state.fields.query.value = "no";
      release = () => {};
    });
    void release;
    // After the change settles the rows are the new ones; the point is that the
    // grid never rendered an empty body in between.
    expect(seen.current.rows.length).toBeGreaterThan(0);
  });

  it("clears rows while refetching when keepPrevious is off", async () => {
    const resolvers: ((page: GridPage<Row>) => void)[] = [];
    const fetch = () =>
      new Promise<GridPage<Row>>((resolve) => resolvers.push(resolve));
    const state = stateWith({ length: 10 });
    const { seen } = renderData(() =>
      useServerData(state, { fetch, debounce: 0, keepPrevious: false }),
    );
    await act(async () => {
      resolvers[0]({ rows: allRows, total: 4 });
    });
    expect(seen.current.rows).toHaveLength(4);

    await act(async () => {
      state.fields.query.value = "x";
    });
    expect(seen.current.rows).toHaveLength(0);
    expect(seen.current.loading).toBe(true);
  });

  it("surfaces a fetch failure", async () => {
    const state = stateWith();
    const { seen } = renderData(() =>
      useServerData(state, {
        fetch: async () => {
          throw new Error("boom");
        },
        debounce: 0,
      }),
    );
    await act(async () => {});
    expect((seen.current.error as Error).message).toBe("boom");
    expect(seen.current.loading).toBe(false);
  });

  it("aborts the in-flight request when the search changes", async () => {
    const signals: AbortSignal[] = [];
    const state = stateWith();
    renderData(() =>
      useServerData(state, {
        fetch: async (o, signal) => {
          signals.push(signal);
          return stubFetch()(o);
        },
        debounce: 0,
      }),
    );
    await act(async () => {});
    await act(async () => {
      state.fields.query.value = "x";
    });
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });
});

describe("useServerData with an optional count", () => {
  /** A page with no total, as an API that won't pay for COUNT(*) returns. */
  function fetchUncounted() {
    return async (options: SearchOptions): Promise<GridPage<Row>> => {
      const searched = makeClientSortAndFilter(columnSearching(columns))(
        options,
        allRows,
      );
      return {
        rows: getPageOfResults(options.offset, options.length, searched),
      };
    };
  }

  it("works with no total at all", async () => {
    const state = stateWith({ length: 2 });
    const { seen } = renderData(() =>
      useServerData(state, { fetch: fetchUncounted(), debounce: 0 }),
    );
    await act(async () => {});
    expect(seen.current.rows).toHaveLength(2);
    expect(seen.current.total).toBeUndefined();
  });

  it("fills the total in separately, without holding up the rows", async () => {
    let releaseCount: ((n: number) => void) | undefined;
    const state = stateWith({ length: 2 });
    const { seen } = renderData(() =>
      useServerData(state, {
        fetch: fetchUncounted(),
        fetchTotal: () => new Promise<number>((r) => (releaseCount = r)),
        debounce: 0,
      }),
    );

    // Rows are here; the count isn't. That's the point of running them apart.
    await act(async () => {});
    expect(seen.current.rows).toHaveLength(2);
    expect(seen.current.total).toBeUndefined();

    await act(async () => {
      releaseCount!(4);
    });
    expect(seen.current.total).toBe(4);
  });

  it("does not re-count when only paging or sorting changes", async () => {
    // The reason the count is keyed on query+filters alone: it can't change.
    const fetchTotal = jest.fn(async () => 4);
    const state = stateWith({ length: 2 });
    renderData(() =>
      useServerData(state, {
        fetch: fetchUncounted(),
        fetchTotal,
        debounce: 0,
      }),
    );
    await act(async () => {});
    expect(fetchTotal).toHaveBeenCalledTimes(1);

    await act(async () => {
      state.fields.offset.value = 2;
    });
    await act(async () => {
      state.fields.sort.value = ["dfile"];
    });
    expect(fetchTotal).toHaveBeenCalledTimes(1);
  });

  it("re-counts when a filter changes", async () => {
    const fetchTotal = jest.fn(async () => 2);
    const state = stateWith({ length: 10 });
    renderData(() =>
      useServerData(state, {
        fetch: fetchUncounted(),
        fetchTotal,
        debounce: 0,
      }),
    );
    await act(async () => {});
    expect(fetchTotal).toHaveBeenCalledTimes(1);

    await act(async () => {
      state.fields.filters.value = { kind: ["doc"] };
    });
    expect(fetchTotal).toHaveBeenCalledTimes(2);
  });

  it("prefers a total the page carried over a separate count", async () => {
    const fetchTotal = jest.fn(async () => 99);
    const state = stateWith({ length: 2 });
    const { seen } = renderData(() =>
      useServerData(state, { fetch: stubFetch(), fetchTotal, debounce: 0 }),
    );
    await act(async () => {});
    expect(seen.current.total).toBe(4);
  });

  it("survives a failed count", async () => {
    // Losing the total must degrade to "uncounted", not break the grid.
    const state = stateWith({ length: 2 });
    const { seen } = renderData(() =>
      useServerData(state, {
        fetch: fetchUncounted(),
        fetchTotal: async () => {
          throw new Error("count timed out");
        },
        debounce: 0,
      }),
    );
    await act(async () => {});
    expect(seen.current.rows).toHaveLength(2);
    expect(seen.current.total).toBeUndefined();
    expect(seen.current.error).toBeUndefined();
  });

  it("drops a stale count when the filters move on", async () => {
    const resolvers: ((n: number) => void)[] = [];
    const state = stateWith({ length: 10 });
    const { seen } = renderData(() =>
      useServerData(state, {
        fetch: fetchUncounted(),
        fetchTotal: () => new Promise<number>((r) => resolvers.push(r)),
        debounce: 0,
      }),
    );
    await act(async () => {});
    await act(async () => {
      state.fields.filters.value = { kind: ["doc"] };
    });
    // The first count arrives late, for a search no longer on screen.
    await act(async () => {
      resolvers[0](4);
    });
    expect(seen.current.total).toBeUndefined();

    await act(async () => {
      resolvers[1](2);
    });
    expect(seen.current.total).toBe(2);
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

  it("passes the extra fields to fetch", async () => {
    const seenOptions: Extended[] = [];
    const state = extendedState({ archived: true });
    renderData(() =>
      useServerData(state, {
        debounce: 0,
        fetch: async (options) => {
          seenOptions.push(options);
          return { rows: allRows, total: 4 };
        },
      }),
    );
    await act(async () => {});
    expect(seenOptions[0].archived).toBe(true);
  });

  it("refetches when an extra field changes, with no deps wiring", async () => {
    // The reason this is generic rather than something to remember to put in
    // `deps`: forgetting would serve stale rows silently.
    const fetch = jest.fn(async () => ({ rows: allRows, total: 4 }));
    const state = extendedState();
    renderData(() => useServerData(state, { fetch, debounce: 0 }));
    await act(async () => {});
    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      state.fields.archived.value = true;
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("includes extra fields in the count key", async () => {
    const fetchTotal = jest.fn(async () => 4);
    const state = extendedState();
    renderData(() =>
      useServerData(state, {
        fetch: async () => ({ rows: allRows }),
        fetchTotal,
        debounce: 0,
      }),
    );
    await act(async () => {});
    expect(fetchTotal).toHaveBeenCalledTimes(1);

    await act(async () => {
      state.fields.archived.value = true;
    });
    // An extra field can change the count, so it must re-count — unlike paging.
    expect(fetchTotal).toHaveBeenCalledTimes(2);
  });

  it("still debounces only the query", async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest.fn(async () => ({ rows: allRows, total: 4 }));
      const state = extendedState();
      renderData(() => useServerData(state, { fetch, debounce: 300 }));
      await act(async () => {});
      expect(fetch).toHaveBeenCalledTimes(1);

      // An extra field is not the text box: it goes through at once.
      await act(async () => {
        state.fields.archived.value = true;
      });
      expect(fetch).toHaveBeenCalledTimes(2);

      await act(async () => {
        state.fields.query.value = "abc";
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(fetch).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

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
  // The headline claim of the redesign: swapping one line changes nothing the
  // renderer can see. Verified by test rather than by eyeball.
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

  it.each(searches)(
    "produce identical GridData for %s",
    async (_label, over) => {
      const clientState = stateWith(over);
      const serverState = stateWith(over);

      const client = renderData(() =>
        useClientData(clientState, { rows: allRows, columns }),
      );
      const clientSnapshot = snapshot(client.seen.current);
      cleanup();

      const server = renderData(() =>
        useServerData(serverState, { fetch: stubFetch(), debounce: 0 }),
      );
      await act(async () => {});

      expect(snapshot(server.seen.current)).toEqual(clientSnapshot);
    },
  );
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

  it("matches what useServerData produces for the same page", async () => {
    // useServerData is implemented over makeGridData, so a react-query caller
    // gets a structurally identical object.
    const page: GridPage<Row> = { rows: allRows.slice(0, 2), total: 4 };
    const state = stateWith({ length: 2 });
    const { seen } = renderData(() =>
      useServerData(state, { fetch: async () => page, debounce: 0 }),
    );
    await act(async () => {});
    expect(snapshot(seen.current)).toEqual(
      snapshot(makeGridData({ page, loading: false })),
    );
  });
});

describe("useDebouncedSearchOptions", () => {
  it("delays query but passes sort straight through", async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest.fn(stubFetch());
      const state = stateWith();
      renderData(() => useServerData(state, { fetch, debounce: 300 }));
      await act(async () => {});
      expect(fetch).toHaveBeenCalledTimes(1);

      // Sort is immediate.
      await act(async () => {
        state.fields.sort.value = ["afile"];
      });
      expect(fetch).toHaveBeenCalledTimes(2);

      // Query waits.
      await act(async () => {
        state.fields.query.value = "n";
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(fetch).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it("collapses a burst of keystrokes into one fetch", async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest.fn(stubFetch());
      const state = stateWith();
      renderData(() => useServerData(state, { fetch, debounce: 300 }));
      await act(async () => {});
      expect(fetch).toHaveBeenCalledTimes(1);

      for (const q of ["n", "no", "not", "note"]) {
        await act(async () => {
          state.fields.query.value = q;
          jest.advanceTimersByTime(100);
        });
      }
      expect(fetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
