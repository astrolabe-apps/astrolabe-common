"use client";

/**
 * datagrid-search against a real API.
 *
 * /fluentgrid/features is the same UI over an in-memory array; here every sort,
 * filter, page and count goes to `POST /api/Car/search?includeTotal=…`, which is
 * `Astrolabe.SearchState`'s `Searcher` over the Cars table. The only line that
 * differs from the client-side version is the data source:
 *
 *   const data = useClientData(state, { rows, columns });   // features page
 *   const data = useServerData(state, { queryKey, search }); // here
 *
 * Two things this page exists to show:
 *
 * - **`includeTotal` end to end.** `useServerData` asks for a total only when it
 *   hasn't got one for the current search; the controller counts only when asked.
 *   The request log below makes that visible: page through and you'll see
 *   `includeTotal=false`, change a filter and the next request counts again.
 * - **Server-side filter options.** `POST /api/Car/filterOptions?field=` groups and
 *   counts the field's values for the search as it stands, so the funnels cascade:
 *   filter to Ford and the Year funnel offers Ford's years. Status skips the trip —
 *   its two values come off the generated `ItemStatus` enum.
 *
 * The filter-mode radios are the third thing worth playing with. `immediate`
 * makes every tick its own search, with no Apply button at all; `apply` holds the
 * selection and the request log stays still until Apply; `excel` defers too, but
 * opens an unfiltered column with every value *ticked* under a `(Select All)`,
 * the way Excel's AutoFilter does. That last one is worth watching against a
 * server: untick one value and Apply and the request carries the rest, but
 * re-tick everything and Apply and the field vanishes from the request entirely
 * — everything selected isn't a filter. Apply is disabled with nothing ticked,
 * because "match none" and "unfiltered" would be the same empty array on the
 * wire.
 *
 * The renderer switch is the fourth. `@astroapps/datagrid-aria` renders the same
 * `GridSearch` with tailwind classes and react-aria overlays, and the diff to swap
 * it in is the component name — the search, the columns, the selection and the
 * data source are all untouched, and the request log doesn't move when you flip
 * it. A side-by-side of the two over an in-memory array is at /ariagrid.
 */

import React, { useState } from "react";
import {
  Button,
  FluentProvider,
  Radio,
  RadioGroup,
  SearchBox,
  Switch,
  makeStyles,
  tokens,
  typographyStyles,
  webLightTheme,
} from "@fluentui/react-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Control, useControl } from "@react-typed-forms/core";
import { columnDefinitions } from "@astroapps/datagrid";
import { FluentDataGrid } from "@astroapps/datagrid-fluent-ui";
import { AriaDataGrid } from "@astroapps/datagrid-aria";
import {
  AsyncFilterOptions,
  FilterMode,
  GetColumnFilter,
  makeGridSelection,
  useGridSearch,
  useServerData,
} from "@astroapps/datagrid-search";
import { SearchOptions, defaultSearchOptions } from "@astroapps/searchstate";
import { CarClient, CarInfo, ItemStatus } from "../../../client";

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * A client per request, because the nswag-generated one takes a *fetcher* rather
 * than a per-call `AbortSignal` — wrapping `fetch` is how react-query's
 * cancellation reaches it. Cheap: the client is a URL and a function.
 */
function carClient(signal?: AbortSignal) {
  // The API serves the exported SPA, so same-origin. In dev the .NET app proxies
  // :8000 through, which is why this works there too.
  const baseUrl = typeof window === "undefined" ? undefined : window.origin;
  return new CarClient(baseUrl, {
    fetch: (url, init) => fetch(url, signal ? { ...init, signal } : init),
  });
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

/**
 * `sortField` and `filterField` are the names the *server* understands, not the
 * column ids: `SearchHelper`'s default sorter and filterer resolve them against
 * `CarItem`'s properties (case-insensitively), converting values to the property
 * type — so Year filters as an int and Status parses as the enum.
 *
 * Model has neither, so its header is a plain label: no arrows, no funnel.
 */
const columns = columnDefinitions<CarInfo>(
  {
    id: "make",
    title: "Make",
    sortField: "make",
    filterField: "make",
    getter: (c) => c.make,
  },
  { id: "model", title: "Model", getter: (c) => c.model },
  {
    id: "year",
    title: "Year",
    sortField: "year",
    filterField: "year",
    getter: (c) => c.year,
  },
  {
    id: "status",
    title: "Status",
    sortField: "status",
    filterField: "status",
    getter: (c) => c.status,
  },
);

/**
 * A row's identity, for keying and for selection.
 *
 * The entity's own id, which is why the search projects it: selection has to
 * survive paging and re-sorting, and anything derived from the visible columns
 * either isn't unique or moves with the row.
 */
const carId = (car: CarInfo) => car.id;

/** Straight off the generated enum — no request needed. */
const statusOptions = Object.values(ItemStatus).map((value) => ({ value }));

/**
 * A field's values, from the server, for the search as it stands.
 *
 * The plain async source: the popup hands it the field, the other filters, the
 * query text and an abort signal, which is exactly the endpoint's input — so
 * options cascade for free. Filter to Ford and the Year funnel offers Ford's
 * years, with Ford's counts.
 *
 * `POST /api/Car/filterOptions?field=` leaves the field's *own* selection out, so
 * a multi-select stays usable: having ticked one make, the others are still there.
 */
const carFieldOptions: AsyncFilterOptions = async ({
  field,
  filters,
  query,
  signal,
}) => {
  const options = await carClient(signal).getFilterOptions(field, {
    ...defaultSearchOptions,
    query,
    filters,
  });
  // `FilterOptionValue` is already `{ value, count }` — the shape a popup wants.
  return options;
};

const getColumnFilter: GetColumnFilter<CarInfo> = (column) => {
  switch (column.id) {
    case "status":
      // Two fixed values off the generated enum: worth knowing the counts, but not
      // worth a request, and they can't cascade to anything the enum doesn't have.
      return { options: statusOptions };
    case "make":
      return { options: carFieldOptions, searchable: true };
    case "year":
      // Same source as Make, so the counts are there — "3 cars are from 2011" is
      // just noise next to a year, so this column doesn't show them.
      return { options: carFieldOptions, showCounts: false };
    default:
      return undefined;
  }
};

// ---------------------------------------------------------------------------
// The grid
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  page: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    backgroundColor: tokens.colorNeutralBackground2,
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
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
  mono: {
    ...typographyStyles.caption1,
    fontFamily: tokens.fontFamilyMonospace,
    color: tokens.colorNeutralForeground3,
  },
  log: {
    ...typographyStyles.caption1,
    fontFamily: tokens.fontFamilyMonospace,
    color: tokens.colorNeutralForeground3,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
});

const MAX_LOG = 6;

function CarGrid({
  state,
  count,
  filterMode,
  aria,
  selectedIds,
  log,
}: {
  state: Control<SearchOptions>;
  count: boolean;
  filterMode: FilterMode;
  /** Render with `@astroapps/datagrid-aria` instead of the Fluent renderer. */
  aria: boolean;
  /** Selected row ids, or undefined when selection is switched off. */
  selectedIds: Control<string[]> | undefined;
  log: Control<string[]>;
}) {
  const styles = useStyles();
  const seeding = useControl(false);

  const data = useServerData(state, {
    queryKey: ["cars", "search"],
    count,
    // `options` is the whole state, so a state extending SearchOptions with
    // filtering of its own would reach the request without any wiring here.
    search: async (options, includeTotal, signal) => {
      const results = await carClient(signal).searchCars(includeTotal, options);
      log.value = [
        `POST /api/Car/search?includeTotal=${includeTotal} → ${results.entries.length} rows` +
          (results.total != null ? `, total=${results.total}` : ""),
        ...log.value,
      ].slice(0, MAX_LOG);
      // `SearchResults<T>` *is* a `GridPage`: `entries` renamed, and its `int?`
      // total — `number | null` once generated — passed straight through, since a
      // `null` total counts as "not counted".
      return { rows: results.entries, total: results.total };
    },
  });
  // Grid-wide, so every funnel agrees. Deferring suits an API-backed grid: an
  // immediate filter is a request per tick, and three ticks would be three
  // searches with the first two stale before they landed. Switch modes above and
  // watch the request log — and the Apply button, which only exists when there's
  // something waiting to be applied.
  //
  // `excel` defers too, and is worth watching here for a reason the client-side
  // demo can't show: applying with every value still ticked sends *no* filter for
  // that field, so the request looks exactly as it did before the popup opened.
  const search = useGridSearch(state, {
    columns,
    data,
    getColumnFilter,
    filterMode,
  });

  // Rebuilt every render on purpose — it reads the control's value when called —
  // and so it can be built conditionally. Selection is page-scoped: it's handed
  // the rows on screen, so the header checkbox covers this page and paging leaves
  // earlier pages' selections alone.
  const selection = selectedIds
    ? makeGridSelection<CarInfo>({
        selected: selectedIds,
        rows: data.rows,
        getId: carId,
      })
    : undefined;

  return (
    <>
      <div className={styles.knobs}>
        <SearchBox
          placeholder="Make or model (debounced 300ms)"
          value={state.fields.query.value ?? ""}
          onChange={(_, d) => {
            state.fields.query.value = d.value;
            state.fields.offset.value = 0;
          }}
        />
        {/*
          Filtering from outside the grid: `search.filter` is the same object the
          funnels drive, so clearing every field here is one call — and `clear()`
          resets paging, since page 3 of a wider result set is somewhere else.
          `activeFields()` is what says whether there's anything to clear.
        */}
        <Button
          size="small"
          disabled={search.filter.activeFields().length === 0}
          onClick={() => search.filter.clear()}
        >
          Clear filters
        </Button>
        <Button size="small" onClick={() => data.reload()}>
          Reload
        </Button>
        <Button
          size="small"
          disabled={seeding.value}
          onClick={async () => {
            seeding.value = true;
            try {
              const total = await carClient().seed(40);
              log.value = [
                `POST /api/Car/seed?count=40 → ${total} cars`,
                ...log.value,
              ].slice(0, MAX_LOG);
              // Filter options are fetched per popup open, so there's nothing
              // cached to drop — only the page needs re-reading.
              data.reload();
            } finally {
              seeding.value = false;
            }
          }}
        >
          {seeding.value ? "Seeding…" : "Seed 40 cars"}
        </Button>
        {selectedIds && (
          <Button
            size="small"
            disabled={selectedIds.value.length === 0}
            onClick={() => (selectedIds.value = [])}
          >
            Deselect all
          </Button>
        )}
        <span className={styles.mono} data-testid="cars-state">
          sort={JSON.stringify(state.fields.sort.value)} filters=
          {JSON.stringify(state.fields.filters.value)} offset=
          {state.fields.offset.value} total={String(data.total)}
          {selectedIds && ` selected=${selectedIds.value.length}`}
        </span>
      </div>
      {/*
        The two renderers take the same props, which is the whole claim: swapping
        one for the other is this ternary and nothing else. No second request
        either — there's one `useServerData` above, and whichever grid renders
        reads the page it produced.
      */}
      {aria ? (
        <AriaDataGrid
          search={search}
          rowKey={carId}
          selection={selection}
          pageSizes={[5, 10, 25]}
          noData="No cars — hit “Seed 40 cars”."
        />
      ) : (
        <FluentDataGrid
          search={search}
          rowKey={carId}
          selection={selection}
          pageSizes={[5, 10, 25]}
          noData="No cars — hit “Seed 40 cars”."
        />
      )}
      <div className={styles.log} data-testid="cars-log">
        {log.value.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </div>
    </>
  );
}

function CarSearchPanel() {
  const styles = useStyles();
  const state = useControl<SearchOptions>({
    ...defaultSearchOptions,
    length: 10,
  });
  const count = useControl(true);
  const filterMode = useControl<FilterMode>("apply");
  const aria = useControl(false);
  // Above the grid, so it survives the remount the count switch forces — and so
  // "what's selected" is the page's state rather than the grid's, which is where
  // a real app would read it from for a bulk action.
  const selectable = useControl(false);
  const selectedIds = useControl<string[]>([]);
  const log = useControl<string[]>([]);

  return (
    <div className={styles.panel}>
      <div className={styles.knobs}>
        <Switch
          label="Ask for a total"
          checked={count.value}
          onChange={(_, d) => {
            count.value = d.checked;
            log.value = [];
          }}
        />
        <span className={styles.mono}>
          {count.value
            ? "counted once per search, then reused while paging"
            : "never counted: the pager shows a range and infers Next from a full page"}
        </span>
      </div>
      <div className={styles.knobs}>
        <RadioGroup
          layout="horizontal"
          value={filterMode.value}
          onChange={(_, d) => {
            filterMode.value = d.value as FilterMode;
            log.value = [];
          }}
        >
          <Radio value="immediate" label="Filter on every tick" />
          <Radio value="apply" label="Hold until Apply" />
          <Radio value="excel" label="Excel-style" />
        </RadioGroup>
        <span className={styles.mono}>
          {filterMode.value === "immediate"
            ? "one search per tick, and no Apply button — the clicks have already landed"
            : filterMode.value === "apply"
              ? "one search per Apply, however many values you tick"
              : "opens all-ticked with a (Select All); apply everything and the field is sent unfiltered"}
        </span>
      </div>
      <div className={styles.knobs}>
        <Switch
          label="Render with datagrid-aria"
          checked={aria.value}
          onChange={(_, d) => (aria.value = d.checked)}
        />
        <span className={styles.mono}>
          {aria.value
            ? "tailwind classes and react-aria overlays, over the same GridSearch"
            : "Fluent v9. The switch changes the grid component and nothing else"}
        </span>
      </div>
      <div className={styles.knobs}>
        <Switch
          label="Selectable rows"
          checked={selectable.value}
          onChange={(_, d) => {
            selectable.value = d.checked;
            // Switching selection off drops what was selected, rather than hiding
            // a selection that can't be seen or undone.
            if (!d.checked) selectedIds.value = [];
          }}
        />
        <span className={styles.mono}>
          {selectable.value
            ? "page-scoped: the header box covers this page, and paging keeps the rest"
            : "no checkbox column — selection is a renderer option, not part of the search"}
        </span>
      </div>
      {/*
        Toggling `count` doesn't change the query key, so nothing would refetch on
        its own — remounting is what makes the switch observable, and it clears the
        cached total at the same time. `filterMode` needs none of that: it's read
        per render, and any open popup closes when you reach for the switch.
      */}
      <CarGrid
        key={`count-${count.value}`}
        state={state}
        count={count.value}
        filterMode={filterMode.value}
        aria={aria.value}
        selectedIds={selectable.value ? selectedIds : undefined}
        log={log}
      />
    </div>
  );
}

export default function CarSearchPage() {
  const styles = useStyles();
  // Per mount rather than at module scope, so a dev fast refresh doesn't leave a
  // stale cache behind.
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <FluentProvider theme={webLightTheme}>
        <div className={styles.page}>
          <div>
            <h1 style={typographyStyles.title3 as any}>Cars, from the API</h1>
            <p style={typographyStyles.body1 as any}>
              Server-side searching over <code>POST /api/Car/search</code>. The
              same grid over an in-memory array, plus the rest of the feature
              tour, is at{" "}
              <a href="/fluentgrid/features">/fluentgrid/features</a>.
            </p>
          </div>
          <CarSearchPanel />
        </div>
      </FluentProvider>
    </QueryClientProvider>
  );
}
