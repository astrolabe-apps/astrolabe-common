import { afterEach, describe, expect, it } from "@jest/globals";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import * as React from "react";
import { newControl, useComponentTracking } from "@react-typed-forms/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { columnDefinitions } from "@astroapps/datagrid";
import {
  defaultSearchOptions,
  getPageOfResults,
  makeClientSortAndFilter,
  type SearchOptions,
} from "@astroapps/searchstate";
import {
  columnSearching,
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
const searching = columnSearching(columns);

function stateWith(over: Partial<SearchOptions> = {}) {
  return newControl<SearchOptions>({
    ...defaultSearchOptions,
    length: 2,
    ...over,
  });
}

// See data.test.tsx: ts-jest doesn't apply the control-tracking transform, so
// `useComponentTracking` is invoked by hand to stay on the real code path.
function tracked(run: () => void) {
  const stop = useComponentTracking();
  try {
    run();
  } finally {
    stop();
  }
}

function renderServer(useData: () => GridData<Row>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const seen: { current: GridData<Row> } = { current: undefined as any };
  function Probe() {
    tracked(() => {
      seen.current = useData();
    });
    return null;
  }
  render(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  return { seen };
}

/** One page as a server would return it, counting only when asked. */
function pageOf(options: SearchOptions, includeTotal: boolean): GridPage<Row> {
  const searched = makeClientSortAndFilter(searching)(options, allRows);
  return {
    rows: getPageOfResults(options.offset, options.length, searched),
    total: includeTotal ? searched.length : undefined,
  };
}

/** A `search` that records the `includeTotal` flag each call was made with. */
function recordingSearch(asked: boolean[]) {
  return async (options: SearchOptions, includeTotal: boolean) => {
    asked.push(includeTotal);
    return pageOf(options, includeTotal);
  };
}

afterEach(cleanup);

describe("useServerData", () => {
  it("fetches a page and counts once", async () => {
    const asked: boolean[] = [];
    const state = stateWith({ length: 2 });
    const { seen } = renderServer(() =>
      useServerData(state, { queryKey: "t", search: recordingSearch(asked) }),
    );
    await waitFor(() => expect(seen.current.rows).toHaveLength(2));
    expect(seen.current.total).toBe(4);
    expect(asked).toEqual([true]);
  });

  it("asks for the total only when the search changes, not on paging or sorting", async () => {
    const asked: boolean[] = [];
    const state = stateWith({ length: 2 });
    const { seen } = renderServer(() =>
      useServerData(state, { queryKey: "t", search: recordingSearch(asked) }),
    );
    await waitFor(() => expect(seen.current.total).toBe(4));
    expect(asked).toEqual([true]);

    await act(async () => {
      state.fields.offset.value = 2;
    });
    await waitFor(() => expect(asked).toEqual([true, false]));

    await act(async () => {
      state.fields.sort.value = ["dfile"];
    });
    await waitFor(() => expect(asked).toEqual([true, false, false]));
    // The total held throughout — paging and sorting can't change it.
    expect(seen.current.total).toBe(4);
  });

  it("re-asks when a filter changes", async () => {
    const asked: boolean[] = [];
    const state = stateWith({ length: 10 });
    const { seen } = renderServer(() =>
      useServerData(state, { queryKey: "t", search: recordingSearch(asked) }),
    );
    await waitFor(() => expect(seen.current.total).toBe(4));

    await act(async () => {
      state.fields.filters.value = { kind: ["doc"] };
    });
    await waitFor(() => expect(seen.current.total).toBe(2));
    expect(asked).toEqual([true, true]);
  });

  it("counts on mount whatever offset the search restored to", async () => {
    // A restored URL can mount straight into the middle of a result set and still
    // needs a total — the condition is "the search changed", not "offset is 0".
    const asked: boolean[] = [];
    const state = stateWith({ length: 2, offset: 2 });
    const { seen } = renderServer(() =>
      useServerData(state, { queryKey: "t", search: recordingSearch(asked) }),
    );
    await waitFor(() => expect(seen.current.total).toBe(4));
    expect(asked).toEqual([true]);
  });

  it("never asks when count is false", async () => {
    const asked: boolean[] = [];
    const state = stateWith({ length: 2 });
    const { seen } = renderServer(() =>
      useServerData(state, {
        queryKey: "t",
        count: false,
        search: recordingSearch(asked),
      }),
    );
    await waitFor(() => expect(seen.current.rows).toHaveLength(2));
    expect(seen.current.total).toBeUndefined();

    await act(async () => {
      state.fields.offset.value = 2;
    });
    await waitFor(() => expect(asked).toEqual([false, false]));
  });

  it("does not re-ask for a total the search declined until it moves", async () => {
    // Asked, but no total came back (a count that failed or wasn't worth it). The
    // attempt is recorded, so paging doesn't re-ask; a search change does.
    const asked: boolean[] = [];
    const search = async (options: SearchOptions, includeTotal: boolean) => {
      asked.push(includeTotal);
      return pageOf(options, false);
    };
    const state = stateWith({ length: 2 });
    const { seen } = renderServer(() =>
      useServerData(state, { queryKey: "t", search }),
    );
    await waitFor(() => expect(seen.current.rows).toHaveLength(2));
    expect(asked).toEqual([true]);

    await act(async () => {
      state.fields.offset.value = 2;
    });
    await waitFor(() => expect(asked).toEqual([true, false]));

    await act(async () => {
      state.fields.filters.value = { kind: ["doc"] };
    });
    await waitFor(() => expect(asked).toEqual([true, false, true]));
  });

  it("re-counts on reload()", async () => {
    const asked: boolean[] = [];
    const state = stateWith({ length: 2 });
    const { seen } = renderServer(() =>
      useServerData(state, { queryKey: "t", search: recordingSearch(asked) }),
    );
    await waitFor(() => expect(seen.current.total).toBe(4));
    expect(asked).toEqual([true]);

    await act(async () => {
      seen.current.reload();
    });
    await waitFor(() => expect(asked).toEqual([true, true]));
  });

  it("surfaces a fetch error", async () => {
    const state = stateWith({ length: 2 });
    const { seen } = renderServer(() =>
      useServerData(state, {
        queryKey: "t",
        search: async () => {
          throw new Error("boom");
        },
      }),
    );
    await waitFor(() =>
      expect((seen.current.error as Error | undefined)?.message).toBe("boom"),
    );
  });
});
