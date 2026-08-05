"use client";

/**
 * One section per goal of the datagrid-search redesign.
 *
 * The headline is the client/server toggle: the two grids differ only by their
 * data source — an in-memory `useClientData` vs react-query feeding `makeGridData`
 * — so flipping it should change nothing visible but the spinner. The two sources
 * are different hooks, so switching at runtime means remounting — hence `key={mode}`
 * over two sibling components sharing one state control.
 */

import React, { useState } from "react";
import {
  Button,
  FluentProvider,
  SearchBox,
  Switch,
  Text,
  makeStyles,
  tokens,
  typographyStyles,
  webLightTheme,
} from "@fluentui/react-components";
import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import { Control, useControl } from "@react-typed-forms/core";
import { columnDefinitions } from "@astroapps/datagrid";
import {
  FilterOption,
  FilterOptionsContext,
  FilterPopupProps,
  GetColumnFilter,
  GridPage,
  makeFilterOptions,
  makeGridData,
  useClientData,
  useDebouncedSearchRequest,
  useGridSearch,
  useServerData,
} from "@astroapps/datagrid-search";
import { FluentDataGrid } from "@astroapps/datagrid-fluent-ui";
import {
  SearchOptions,
  defaultSearchOptions,
  makeClientSortAndFilter,
  getPageOfResults,
} from "@astroapps/searchstate";
import { columnSearching } from "@astroapps/datagrid-search";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface FileRow {
  id: string;
  file: string;
  author: string;
  category: string;
  size: number;
}

const CATEGORIES = ["Document", "Presentation", "Video", "Spreadsheet"];
const AUTHORS = ["Max Mustermann", "Erika Mustermann", "John Doe", "Jane Doe"];

const rows: FileRow[] = Array.from({ length: 37 }, (_, i) => ({
  id: String(i + 1),
  file: `File ${String(i + 1).padStart(2, "0")}`,
  author: AUTHORS[i % AUTHORS.length],
  category: CATEGORIES[i % CATEGORIES.length],
  size: ((i * 37) % 90) + 1,
}));

/**
 * `data` carries whatever a column's filter behaviour should be derived from —
 * here a coarse type, which is how a schema-generated column would identify
 * itself. `getColumnFilter` switches on it rather than enumerating fields.
 */
interface ColumnMeta {
  kind?: "enum" | "number";
}

const columns = columnDefinitions<FileRow, ColumnMeta>(
  { id: "file", title: "File", sortField: "file", getter: (r) => r.file },
  {
    id: "author",
    title: "Author",
    sortField: "author",
    filterField: "author",
    getter: (r) => r.author,
    data: { kind: "enum" },
  },
  {
    id: "category",
    title: "Category",
    sortField: "category",
    filterField: "category",
    getter: (r) => r.category,
    data: { kind: "enum" },
  },
  {
    id: "size",
    title: "Size (MB)",
    sortField: "size",
    filterField: "size",
    getter: (r) => r.size,
    data: { kind: "number" },
  },
);

const searching = columnSearching(columns);

/**
 * Stands in for an API: same search semantics, with latency and facets.
 *
 * `withTotal` models the real choice — returning a count means a second query
 * over the whole filtered set, which many endpoints won't pay for.
 */
async function fakeSearch(
  options: SearchOptions,
  signal: AbortSignal,
  withTotal = true,
): Promise<GridPage<FileRow>> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (signal.aborted) throw new Error("aborted");
  const matched = makeClientSortAndFilter(searching)(options, rows);
  // A real search API returns facet counts with the page, which is why
  // server-side filter options need no second request.
  const facets: Record<string, FilterOption[]> = {};
  for (const field of ["author", "category"]) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = field === "author" ? row.author : row.category;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    facets[field] = [...counts].map(([value, count]) => ({ value, count }));
  }
  return {
    rows: getPageOfResults(options.offset, options.length, matched),
    ...(withTotal && { total: matched.length }),
    facets,
  };
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  page: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    backgroundColor: tokens.colorNeutralBackground2,
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  knobs: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "16px",
  },
  state: {
    ...typographyStyles.caption1,
    fontFamily: tokens.fontFamilyMonospace,
    color: tokens.colorNeutralForeground3,
  },
  range: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    minWidth: "160px",
  },
  rangeRow: { display: "flex", gap: tokens.spacingHorizontalS },
});

function Section({
  title,
  children,
  blurb,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <div className={styles.section}>
      <div style={typographyStyles.subtitle2 as any}>{title}</div>
      <p style={typographyStyles.caption1 as any}>{blurb}</p>
      {children}
    </div>
  );
}

function newState(over: Partial<SearchOptions> = {}) {
  return { ...defaultSearchOptions, length: 5, ...over };
}

// ---------------------------------------------------------------------------
// 1. The client/server swap
// ---------------------------------------------------------------------------

/** Client-side: the whole array in memory. */
function ClientGrid({ state }: { state: Control<SearchOptions> }) {
  const data = useClientData(state, { rows, columns });
  const search = useGridSearch(state, { columns, data });
  return <FluentDataGrid search={search} rowKey={(r) => r.id} />;
}

/**
 * Server-side: one page at a time, via `useServerData` — react-query for the
 * fetching, plus "count once per search". The count rides the page response
 * (SearchHelper returns `SearchResults`, i.e. rows + total, in one call), and
 * `includeTotal` is the server's `needsTotal`: the hook asks for it only when it
 * hasn't got a total for the current search, caching it on a key that excludes
 * paging so pages reuse it. Identical below this line.
 */
function ServerGrid({
  state,
  count,
}: {
  state: Control<SearchOptions>;
  count: boolean;
}) {
  const data = useServerData(state, {
    queryKey: "swap",
    count,
    search: (options, includeTotal, signal) =>
      fakeSearch(options, signal, includeTotal),
  });
  const search = useGridSearch(state, { columns, data });
  return <FluentDataGrid search={search} rowKey={(r) => r.id} />;
}

function SwapSection() {
  const styles = useStyles();
  const serverSide = useControl(false);
  const count = useControl(true);
  const state = useControl<SearchOptions>(newState());
  const mode = serverSide.value ? "server" : "client";

  return (
    <Section
      title="1. Client ↔ server, one data source apart"
      blurb="Both grids call useGridSearch with the same columns; only the data source differs — useClientData over an in-memory array, or react-query + makeGridData over a fetching API. Sort, filter, query and paging behave identically; the server version just has latency, and gets its filter options from the response's facets instead of deriving them from rows."
    >
      <div className={styles.knobs}>
        <Switch
          label="Server-side"
          checked={serverSide.value}
          onChange={(_, d) => (serverSide.value = d.checked)}
        />
        <SearchBox
          placeholder="Query (debounced 300ms server-side)"
          value={state.fields.query.value ?? ""}
          onChange={(_, d) => (state.fields.query.value = d.value)}
        />
        <span className={styles.state} data-testid="swap-state">
          mode={mode} sort={JSON.stringify(state.fields.sort.value)} filters=
          {JSON.stringify(state.fields.filters.value)} offset=
          {state.fields.offset.value}
        </span>
      </div>
      {serverSide.value && (
        <div className={styles.knobs}>
          <Switch
            label="Count total"
            checked={count.value}
            onChange={(_, d) => (count.value = d.checked)}
          />
          <span className={styles.state}>
            {count.value
              ? "counted once per search (includeTotal), reused across pages"
              : "no total: the pager shows 1-5 and infers Next from a full page"}
          </span>
        </div>
      )}
      {/*
        The two data sources can't alternate inside one component (react-query's
        hooks vs useClientData), so the mode switch remounts. That also discards
        the stale page and any in-flight request, which is what you'd want anyway.
      */}
      {serverSide.value ? (
        <ServerGrid
          key={`server-${count.value}`}
          state={state}
          count={count.value}
        />
      ) : (
        <ClientGrid key="client" state={state} />
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 2. Sort only / 3. Filter only — opting out by metadata
// ---------------------------------------------------------------------------

const sortOnlyColumns = columnDefinitions<FileRow>(
  { id: "file", title: "File", sortField: "file", getter: (r) => r.file },
  {
    id: "author",
    title: "Author",
    sortField: "author",
    getter: (r) => r.author,
  },
  { id: "size", title: "Size (MB)", sortField: "size", getter: (r) => r.size },
);

const filterOnlyColumns = columnDefinitions<FileRow>(
  { id: "file", title: "File", getter: (r) => r.file },
  {
    id: "author",
    title: "Author",
    filterField: "author",
    getter: (r) => r.author,
  },
  {
    id: "category",
    title: "Category",
    filterField: "category",
    getter: (r) => r.category,
  },
);

function MetadataSection() {
  const sortState = useControl<SearchOptions>(newState({ sort: ["afile"] }));
  const filterState = useControl<SearchOptions>(newState());

  const sortData = useClientData(sortState, {
    rows,
    columns: sortOnlyColumns,
  });
  const sortSearch = useGridSearch(sortState, {
    columns: sortOnlyColumns,
    data: sortData,
  });

  const filterData = useClientData(filterState, {
    rows,
    columns: filterOnlyColumns,
  });
  const filterSearch = useGridSearch(filterState, {
    columns: filterOnlyColumns,
    data: filterData,
  });

  return (
    <>
      <Section
        title="2. Sort only"
        blurb="Every column has a sortField and none has a filterField, so there are sort arrows and no funnels. No flags involved — the affordances follow the column metadata."
      >
        <FluentDataGrid search={sortSearch} rowKey={(r) => r.id} />
      </Section>
      <Section
        title="3. Filter only"
        blurb="The mirror image: filterField on Author and Category, no sortField anywhere. File has neither, so its header is a plain label."
      >
        <FluentDataGrid search={filterSearch} rowKey={(r) => r.id} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// 4. Async options, 5. getColumnFilter by column.data, 6. a custom popup
// ---------------------------------------------------------------------------

/** A numeric-range popup: writes one string, and interprets it with `matches`. */
function SizeRangePopup({
  selected,
  values,
  close,
}: FilterPopupProps<FileRow>) {
  const styles = useStyles();
  const [from, to] = (values[0] ?? "..").split("..");
  const min = useControl(from ?? "");
  const max = useControl(to ?? "");

  return (
    <div className={styles.range}>
      <Text size={200}>Size between (MB)</Text>
      <div className={styles.rangeRow}>
        <input
          aria-label="Minimum size"
          value={min.value}
          onChange={(e) => (min.value = e.target.value)}
          style={{ width: 60 }}
        />
        <input
          aria-label="Maximum size"
          value={max.value}
          onChange={(e) => (max.value = e.target.value)}
          style={{ width: 60 }}
        />
      </div>
      <div className={styles.rangeRow}>
        <Button
          size="small"
          appearance="primary"
          onClick={() => {
            // The whole contract: write strings to this column's control. The
            // popup never learns that a shared filters map exists.
            selected.value =
              min.value || max.value ? [`${min.value}..${max.value}`] : [];
            close();
          }}
        >
          Apply
        </Button>
        <Button
          size="small"
          onClick={() => {
            selected.value = [];
            close();
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

function sizeMatches(row: FileRow, values: string[]) {
  return values.every((v) => {
    const [from, to] = v.split("..");
    if (from && row.size < Number(from)) return false;
    if (to && row.size > Number(to)) return false;
    return true;
  });
}

/** Fetches a field's values, as a server-backed dropdown would. */
async function fetchFieldOptions(field: string): Promise<FilterOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const values = field === "author" ? AUTHORS : CATEGORIES;
  return values.map((value) => ({ value, label: `${value} (fetched)` }));
}

/**
 * Options through react-query.
 *
 * This package caches nothing itself — the popup unmounts on close, so a plain
 * async source refetches every time it opens. That's the recommended way to get
 * caching, deduping and retries instead: the `{ hook }` variant hands the whole
 * job to the query library you already have. Open the Author funnel, close it,
 * open it again: the second open is instant.
 */
function useQueriedOptions({ field, signal }: FilterOptionsContext) {
  const query = useQuery({
    queryKey: ["facets", field],
    queryFn: () => fetchFieldOptions(field),
    staleTime: 5 * 60 * 1000,
  });
  void signal; // react-query manages its own cancellation
  return makeFilterOptions({
    options: query.data,
    loading: query.isPending,
    error: query.error,
    reload: query.refetch,
  });
}

/**
 * One rule per column *kind*, not per field. This is the case the function form
 * exists for: a schema-generated column would identify itself through
 * `column.data` in exactly this way.
 */
const getColumnFilter: GetColumnFilter<FileRow, ColumnMeta> = (column) => {
  switch (column.data?.kind) {
    case "enum":
      return column.id === "author"
        ? // Fetched through react-query, so the query library owns the caching.
          { options: { hook: useQueriedOptions }, searchable: true }
        : // Derived from the rows on screen, with counts.
          {};
    case "number":
      return { render: SizeRangePopup, matches: sizeMatches };
    default:
      return undefined;
  }
};

function FilterConfigSection() {
  const styles = useStyles();
  const state = useControl<SearchOptions>(newState({ length: 8 }));
  const data = useClientData(state, { rows, columns, getColumnFilter });
  const search = useGridSearch(state, { columns, data, getColumnFilter });

  return (
    <Section
      title="4–6. Async options, patterned config, and a custom popup"
      blurb="getColumnFilter switches on column.data.kind rather than listing fields. Author's options come from react-query through a { hook } source — open its funnel, close it, open it again and the second one is instant, because the query library caches and this package doesn't. Category's are derived from the rows with counts. Size gets a range popup that writes one string like '20..60' plus a matches predicate to interpret it."
    >
      <div className={styles.knobs}>
        <Button
          size="small"
          onClick={() => search.filter.clear()}
          disabled={search.filter.activeFields().length === 0}
        >
          Clear all filters
        </Button>
        <span className={styles.state} data-testid="filter-state">
          filters={JSON.stringify(state.fields.filters.value)}
        </span>
      </div>
      <FluentDataGrid
        search={search}
        rowKey={(r) => r.id}
        pageSizes={[5, 8, 20]}
      />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 7. Filtering that lives outside the grid
// ---------------------------------------------------------------------------

/**
 * Most real search pages have filters that aren't column filters — a date range,
 * a tenant, a "show archived" toggle. Put them in the same state and every hook
 * carries them: `fetch` receives them, the refetch key includes them, and the
 * count key includes them too (it excludes only paging and sort, which can't
 * change a count).
 */
interface FilesSearch extends SearchOptions {
  minSize: number;
}

function ExternalFilterSection() {
  const styles = useStyles();
  const state = useControl<FilesSearch>({ ...newState(), minSize: 0 });
  const serverSide = useControl(false);
  const minSize = state.fields.minSize.value;

  return (
    <Section
      title="7. Filtering from outside the grid"
      blurb="The state extends SearchOptions with a minSize field that no column owns. Server-side it reaches the API for free, because the search is handed the whole state. Client-side the rows have to be tested locally, since the library can't know what the field means — that's what additionalFilter is for."
    >
      <div className={styles.knobs}>
        <Switch
          label="Server-side"
          checked={serverSide.value}
          onChange={(_, d) => (serverSide.value = d.checked)}
        />
        <Text size={200}>Minimum size (MB)</Text>
        <input
          type="range"
          min={0}
          max={90}
          value={minSize}
          aria-label="Minimum size"
          onChange={(e) => {
            state.fields.minSize.value = Number(e.target.value);
            // The grid resets paging for its own controls; an external one has to
            // do it itself, or you land on a page that no longer exists.
            state.fields.offset.value = 0;
          }}
        />
        <span className={styles.state} data-testid="external-state">
          minSize={minSize}
        </span>
      </div>
      {serverSide.value ? (
        <ExternalServerGrid key="server" state={state} />
      ) : (
        <ExternalClientGrid key="client" state={state} />
      )}
    </Section>
  );
}

function ExternalClientGrid({ state }: { state: Control<FilesSearch> }) {
  const minSize = state.fields.minSize.value;
  const data = useClientData(state, {
    rows,
    columns,
    getColumnFilter,
    additionalFilter: (row) => row.size >= minSize,
  });
  const search = useGridSearch(state, { columns, data, getColumnFilter });
  return <FluentDataGrid search={search} rowKey={(r) => r.id} />;
}

function ExternalServerGrid({ state }: { state: Control<FilesSearch> }) {
  const data = useServerData(state, {
    queryKey: "external",
    // minSize is applied client-side below, so the server's total wouldn't match
    // the rows shown — opt out of counting rather than report a wrong "of N".
    count: false,
    // `options.minSize` is here without any extra wiring, and changing it
    // refetches — it's part of the state, so it's part of the key.
    search: async (options, _includeTotal, signal) => {
      const page = await fakeSearch(options, signal, false);
      const big = page.rows.filter((r) => r.size >= options.minSize);
      return { ...page, rows: big, total: undefined };
    },
  });
  const search = useGridSearch(state, { columns, data, getColumnFilter });
  return <FluentDataGrid search={search} rowKey={(r) => r.id} />;
}

// ---------------------------------------------------------------------------
// 8. react-query, with no dependency in either library
// ---------------------------------------------------------------------------

function QuerySection() {
  const styles = useStyles();
  const state = useControl<SearchOptions>(newState());

  // useDebouncedSearchRequest is the piece react-query lacks: it settles the
  // text field before it reaches the key, while letting sort and paging through
  // immediately. The result is a plain object, so it works as a query key.
  const options = useDebouncedSearchRequest(state, 300);
  const query = useQuery({
    queryKey: ["files", options],
    queryFn: ({ signal }) => fakeSearch(options, signal),
    // Keeps the previous page on screen while the next one loads, so the grid
    // doesn't flash empty.
    placeholderData: keepPreviousData,
  });

  // The whole interop, in one call. `isFetching` rather than `isPending`: with
  // placeholderData there *is* data during a refetch, so isPending would report
  // false and the grid would never show it was loading.
  const data = makeGridData({
    page: query.data,
    loading: query.isFetching,
    error: query.error,
    reload: query.refetch,
  });
  const search = useGridSearch(state, { columns, data, getColumnFilter });

  return (
    <Section
      title="8. Driven by react-query"
      blurb="GridData is a plain interface, so anything that can produce one drives the grid — no fetching hook from this package involved, and neither library depends on react-query. makeGridData maps a useQuery result in one line and picks filter options up from the response's facets."
    >
      <div className={styles.knobs}>
        <SearchBox
          placeholder="Query (settles before it reaches the key)"
          value={state.fields.query.value ?? ""}
          onChange={(_, d) => (state.fields.query.value = d.value)}
        />
        <Button size="small" onClick={() => data.reload()}>
          Reload
        </Button>
        <span className={styles.state} data-testid="query-state">
          key={JSON.stringify(options.query)} fetching=
          {String(query.isFetching)}
        </span>
      </div>
      <FluentDataGrid search={search} rowKey={(r) => r.id} />
    </Section>
  );
}

// ---------------------------------------------------------------------------

export default function FluentGridFeatures() {
  const styles = useStyles();
  // Created once per mount rather than at module scope, so a fast refresh in dev
  // doesn't leave a stale cache behind.
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <FluentProvider theme={webLightTheme}>
        <div className={styles.page}>
          <div>
            <h1 style={typographyStyles.title3 as any}>
              datagrid-search feature tour
            </h1>
            <p style={typographyStyles.body1 as any}>
              Everything here runs against an in-memory array. The same grid
              against a real endpoint — <code>POST /api/Car/search</code> — is
              at <a href="/fluentgrid/cars">/fluentgrid/cars</a>, and the pixel
              comparison against Fluent&apos;s own DataGrid is at{" "}
              <a href="/fluentgrid">/fluentgrid</a>.
            </p>
          </div>
          <SwapSection />
          <MetadataSection />
          <FilterConfigSection />
          <ExternalFilterSection />
          <QuerySection />
        </div>
      </FluentProvider>
    </QueryClientProvider>
  );
}
