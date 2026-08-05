import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, cleanup, render } from "@testing-library/react";
import * as React from "react";
import { newControl, useComponentTracking } from "@react-typed-forms/core";
import { columnDefinitions, type ColumnDef } from "@astroapps/datagrid";
import {
  defaultSearchOptions,
  type SearchRequest,
} from "@astroapps/searchstate";
import {
  makeFilterOptions,
  makeGridData,
  useClientData,
  useGridSearch,
  type FilterOption,
  type FilterOptions,
  type GetColumnFilter,
  type GridSearch,
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
const kindColumn = columns[1];
const fileColumn = columns[0];

function stateWith(over: Partial<SearchRequest> = {}) {
  return newControl<SearchRequest>({
    ...defaultSearchOptions,
    length: 10,
    ...over,
  });
}

function tracked(body: () => void) {
  const stop = useComponentTracking();
  try {
    body();
  } finally {
    stop();
  }
}

/**
 * Mounts a grid, then mounts the "popup" as a *separate child component* — which
 * is what makes an async source lazy in practice: the options hook only runs once
 * the popover surface exists.
 */
function renderPopup(
  getColumnFilter: GetColumnFilter<Row> | undefined,
  o: {
    state?: ReturnType<typeof stateWith>;
    column?: ColumnDef<Row, unknown>;
    open?: boolean;
    serverFacets?: Record<string, FilterOption[]>;
  } = {},
) {
  const state = o.state ?? stateWith();
  const column = o.column ?? kindColumn;
  const seen: { options?: FilterOptions; search?: GridSearch<Row> } = {};
  let renders = 0;

  function Popup({ search }: { search: GridSearch<Row> }) {
    tracked(() => {
      renders++;
      seen.options = search.useFilterOptions(column);
    });
    return null;
  }

  function Grid({ open }: { open: boolean }) {
    let search!: GridSearch<Row>;
    tracked(() => {
      const data = o.serverFacets
        ? makeGridData<Row>({
            page: {
              rows: allRows,
              total: allRows.length,
              facets: o.serverFacets,
            },
          })
        : useClientData(state, { rows: allRows, columns, getColumnFilter });
      search = useGridSearch(state, { columns, data, getColumnFilter });
      seen.search = search;
    });
    return open ? <Popup search={search} /> : null;
  }

  const rendered = render(<Grid open={o.open ?? true} />);
  return {
    seen,
    renderCount: () => renders,
    setOpen: (open: boolean) =>
      act(() => {
        rendered.rerender(<Grid open={open} />);
      }),
  };
}

afterEach(cleanup);

describe("resolution order", () => {
  it("prefers the column's own static options", async () => {
    const { seen } = renderPopup(() => ({
      options: [{ value: "doc", label: "Only doc" }],
    }));
    expect(seen.options!.options).toEqual([
      { value: "doc", label: "Only doc" },
    ]);
    expect(seen.options!.loading).toBe(false);
  });

  it("falls back to server facets", async () => {
    const { seen } = renderPopup(undefined, {
      serverFacets: { kind: [{ value: "img", count: 2 }] },
    });
    expect(seen.options!.options).toEqual([{ value: "img", count: 2 }]);
  });

  it("falls back to client-derived options with counts", async () => {
    const { seen } = renderPopup(undefined);
    expect(seen.options!.options).toEqual([
      { value: "doc", label: "doc", count: 2 },
      { value: "img", label: "img", count: 2 },
    ]);
  });

  it("returns nothing for a column with no filter at all", async () => {
    const { seen } = renderPopup(undefined, { column: fileColumn });
    expect(seen.options!.options).toEqual([]);
    expect(seen.options!.loading).toBe(false);
  });

  it("returns an empty list for a facet the server did not send", async () => {
    const { seen } = renderPopup(undefined, { serverFacets: { other: [] } });
    expect(seen.options!.options).toEqual([]);
  });

  it("derives from rows the column declares itself", async () => {
    const { seen } = renderPopup(() => ({
      options: { fromRows: () => allRows.slice(0, 1), counts: false },
    }));
    expect(seen.options!.options).toEqual([{ value: "doc", label: "doc" }]);
  });

  it("honours a per-source max", async () => {
    const { seen } = renderPopup(() => ({
      options: { fromRows: () => allRows, max: 1 },
    }));
    expect(seen.options!.options).toHaveLength(1);
  });
});

describe("client-derived options reflect the search", () => {
  it("excludes the column's own filter but applies others", async () => {
    const state = stateWith({ filters: { kind: ["doc"] } });
    const { seen } = renderPopup(undefined, { state });
    // Both kinds still offered, so the selection can be changed.
    expect(seen.options!.options.map((o) => o.value)).toEqual(["doc", "img"]);
  });

  it("updates when the query changes", async () => {
    const state = stateWith();
    const { seen } = renderPopup(undefined, { state });
    expect(seen.options!.options).toHaveLength(2);
    await act(async () => {
      state.fields.query.value = "logo";
    });
    expect(seen.options!.options.map((o) => o.value)).toEqual(["img"]);
  });
});

describe("async options", () => {
  it("does not fetch until the popup mounts", async () => {
    const fetchOptions = jest.fn(async () => [{ value: "doc" }]);
    const popup = renderPopup(() => ({ options: fetchOptions }), {
      open: false,
    });
    // The grid rendered; no popover, so no request. This is the laziness the
    // design relies on being structural rather than arranged.
    expect(fetchOptions).not.toHaveBeenCalled();

    await act(async () => {
      popup.setOpen(true);
    });
    expect(fetchOptions).toHaveBeenCalledTimes(1);
    expect(popup.seen.options!.options).toEqual([{ value: "doc" }]);
  });

  it("reports loading before it resolves", async () => {
    let release: ((o: FilterOption[]) => void) | undefined;
    const { seen } = renderPopup(() => ({
      options: () => new Promise<FilterOption[]>((r) => (release = r)),
    }));
    expect(seen.options!.loading).toBe(true);
    expect(seen.options!.options).toEqual([]);

    await act(async () => {
      release!([{ value: "doc" }]);
    });
    expect(seen.options!.loading).toBe(false);
    expect(seen.options!.options).toEqual([{ value: "doc" }]);
  });

  it("surfaces a failure", async () => {
    const { seen } = renderPopup(() => ({
      options: async () => {
        throw new Error("nope");
      },
    }));
    await act(async () => {});
    expect((seen.options!.error as Error).message).toBe("nope");
    expect(seen.options!.loading).toBe(false);
  });

  it("refetches on reopen, since nothing here caches", async () => {
    // Deliberate: state lives in the hook, so closing discards it. An internal
    // cache only bought surviving close/reopen and could disagree with a real
    // one — use the `{ hook }` source with a query library to get caching.
    const fetchOptions = jest.fn(async () => [{ value: "doc" }]);
    const popup = renderPopup(() => ({ options: fetchOptions }));
    await act(async () => {});
    expect(fetchOptions).toHaveBeenCalledTimes(1);

    await act(async () => {
      popup.setOpen(false);
    });
    await act(async () => {
      popup.setOpen(true);
    });
    expect(fetchOptions).toHaveBeenCalledTimes(2);
    expect(popup.seen.options!.options).toEqual([{ value: "doc" }]);
  });

  it("lets a hook source do the caching instead", async () => {
    // The recommended path: whatever the hook wraps owns caching, so reopening
    // costs nothing even though this package caches nothing.
    const load = jest.fn(async () => [{ value: "cached" }]);
    const cache = new Map<string, FilterOption[]>();
    const popup = renderPopup(() => ({
      options: {
        hook: ({ field }) => {
          const [hit, setHit] = React.useState(() => cache.get(field));
          React.useEffect(() => {
            if (hit) return;
            load().then((options) => {
              cache.set(field, options);
              setHit(options);
            });
          }, [field, hit]);
          return makeFilterOptions({ options: hit, loading: !hit });
        },
      },
    }));
    await act(async () => {});
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => {
      popup.setOpen(false);
    });
    await act(async () => {
      popup.setOpen(true);
    });
    expect(load).toHaveBeenCalledTimes(1);
    expect(popup.seen.options!.options).toEqual([{ value: "cached" }]);
  });

  it("refetches when another column's filter changes, for cascading options", async () => {
    const fetchOptions = jest.fn(async (ctx: { filters: unknown }) => [
      { value: JSON.stringify(ctx.filters) },
    ]);
    const state = stateWith();
    const popup = renderPopup(
      (c) => (c === kindColumn ? { options: fetchOptions } : undefined),
      { state },
    );
    await act(async () => {});
    expect(fetchOptions).toHaveBeenCalledTimes(1);

    await act(async () => {
      state.fields.filters.value = { other: ["x"] };
    });
    expect(fetchOptions).toHaveBeenCalledTimes(2);
    expect(popup.seen.options!.options[0].value).toContain("other");
  });

  it("refetches on reload()", async () => {
    const fetchOptions = jest.fn(async () => [{ value: "doc" }]);
    const { seen } = renderPopup(() => ({ options: fetchOptions }));
    await act(async () => {});
    expect(fetchOptions).toHaveBeenCalledTimes(1);
    await act(async () => {
      seen.options!.reload();
    });
    expect(fetchOptions).toHaveBeenCalledTimes(2);
  });

  it("aborts when the popup unmounts mid-flight", async () => {
    const signals: AbortSignal[] = [];
    const popup = renderPopup(() => ({
      options: async (ctx) => {
        signals.push(ctx.signal);
        return [{ value: "doc" }];
      },
    }));
    await act(async () => {
      popup.setOpen(false);
    });
    expect(signals[0].aborted).toBe(true);
  });
});

describe("hook sources", () => {
  it("uses the caller's own hook, bypassing the internal cache", async () => {
    // The react-query path: whatever library the hook wraps owns caching, so this
    // must not be double-cached or refetched by us.
    const calls = { n: 0 };
    const { seen } = renderPopup(() => ({
      options: {
        hook: () => {
          calls.n++;
          return makeFilterOptions({ options: [{ value: "from-hook" }] });
        },
      },
    }));
    expect(seen.options!.options).toEqual([{ value: "from-hook" }]);
    expect(calls.n).toBeGreaterThan(0);
  });

  it("passes the search context to the hook", async () => {
    const seenCtx: { field?: string; query?: string | null }[] = [];
    const state = stateWith({ query: "abc" });
    renderPopup(
      () => ({
        options: {
          hook: (ctx) => {
            seenCtx.push({ field: ctx.field, query: ctx.query });
            return makeFilterOptions({ options: [] });
          },
        },
      }),
      { state },
    );
    expect(seenCtx[0]).toEqual({ field: "kind", query: "abc" });
  });
});

describe("canFilter", () => {
  it("is false without a filter config", async () => {
    const { seen } = renderPopup(undefined, { column: fileColumn });
    expect(seen.search!.canFilter(fileColumn)).toBe(false);
  });

  it("is true when the column declares options", async () => {
    const { seen } = renderPopup(() => ({ options: [{ value: "x" }] }));
    expect(seen.search!.canFilter(kindColumn)).toBe(true);
  });

  it("is true when the data source can derive them", async () => {
    const { seen } = renderPopup(undefined);
    expect(seen.search!.canFilter(kindColumn)).toBe(true);
  });
});

describe("useGridSearch", () => {
  it("exposes sort and filter over the same state", async () => {
    const state = stateWith({ sort: ["dfile"], filters: { kind: ["doc"] } });
    const { seen } = renderPopup(undefined, { state });
    expect(seen.search!.sort.direction(fileColumn)).toBe("desc");
    expect(seen.search!.filter.values("kind")).toEqual(["doc"]);
  });

  it("resolves a column's filter once and reuses it", async () => {
    const getColumnFilter = jest.fn<GetColumnFilter<Row>>((c) =>
      c.filterField ? { options: [{ value: "x" }] } : undefined,
    );
    const { seen } = renderPopup(getColumnFilter);
    const before = getColumnFilter.mock.calls.length;
    seen.search!.filterFor(kindColumn);
    seen.search!.filterFor(kindColumn);
    expect(getColumnFilter.mock.calls.length).toBe(before);
  });
});
