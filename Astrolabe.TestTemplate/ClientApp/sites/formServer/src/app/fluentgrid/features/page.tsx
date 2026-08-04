"use client";

/**
 * One section per goal of the datagrid-search redesign.
 *
 * The headline is the client/server toggle: the two grids differ by which data
 * hook they call and nothing else, so flipping it should change nothing visible
 * but the spinner. Because the mode is fixed per call site (they're separate
 * hooks), switching at runtime means remounting — hence `key={mode}` over two
 * sibling components sharing one state control.
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
  FilterPopupProps,
  GetColumnFilter,
  GridPage,
  makeFilterOptions,
  makeGridData,
  useClientData,
  useDebouncedSearchOptions,
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

/** Stands in for an API: same search semantics, with latency and facets. */
async function fakeSearch(
  options: SearchOptions,
  signal: AbortSignal,
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
    total: matched.length,
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

/** Server-side: one page at a time. Identical below this line. */
function ServerGrid({ state }: { state: Control<SearchOptions> }) {
  const data = useServerData(state, { fetch: fakeSearch });
  const search = useGridSearch(state, { columns, data });
  return <FluentDataGrid search={search} rowKey={(r) => r.id} />;
}

function SwapSection() {
  const styles = useStyles();
  const serverSide = useControl(false);
  const state = useControl<SearchOptions>(newState());
  const mode = serverSide.value ? "server" : "client";

  return (
    <Section
      title="1. Client ↔ server, one line apart"
      blurb="Both grids call useGridSearch with the same columns; only the data hook differs (useClientData vs useServerData). Sort, filter, query and paging behave identically — the server version just has latency, and gets its filter options from the response's facets instead of deriving them from rows."
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
      {/*
        The two hooks can't alternate inside one component, so the mode switch
        remounts. That also discards the stale page and any in-flight request,
        which is the behaviour you'd want anyway.
      */}
      {serverSide.value ? (
        <ServerGrid key="server" state={state} />
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
  { id: "author", title: "Author", sortField: "author", getter: (r) => r.author },
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
function SizeRangePopup({ selected, values, close }: FilterPopupProps<FileRow>) {
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
async function fetchAuthorOptions(): Promise<FilterOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return AUTHORS.map((value) => ({ value, label: `${value} (fetched)` }));
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
        ? // Async, fetched when the popover opens and cached after.
          { options: fetchAuthorOptions, searchable: true }
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
      blurb="getColumnFilter switches on column.data.kind rather than listing fields. Author's options are fetched (open its funnel and watch it load, then reopen — cached); Category's are derived from the rows with counts; Size gets a range popup that writes one string like '20..60' and a matches predicate to interpret it."
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
      <FluentDataGrid search={search} rowKey={(r) => r.id} pageSizes={[5, 8, 20]} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 7. react-query, with no dependency in either library
// ---------------------------------------------------------------------------

function QuerySection() {
  const styles = useStyles();
  const state = useControl<SearchOptions>(newState());

  // useDebouncedSearchOptions is the piece react-query lacks: it settles the
  // text field before it reaches the key, while letting sort and paging through
  // immediately. The result is a plain object, so it works as a query key.
  const options = useDebouncedSearchOptions(state, 300);
  const query = useQuery({
    queryKey: ["files", options],
    queryFn: ({ signal }) => fakeSearch(options, signal),
    // Keeps the previous page on screen while the next one loads, so the grid
    // doesn't flash empty — the same job useServerData's `keepPrevious` does.
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
      title="7. Driven by react-query"
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
              The pixel comparison against Fluent&apos;s own DataGrid is at{" "}
              <a href="/fluentgrid">/fluentgrid</a>.
            </p>
          </div>
          <SwapSection />
          <MetadataSection />
          <FilterConfigSection />
          <QuerySection />
        </div>
      </FluentProvider>
    </QueryClientProvider>
  );
}
