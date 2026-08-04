# @astroapps/datagrid-search

Headless sort, filter, paging and filter-option resolution for
[`@astroapps/datagrid`](../astrolabe-datagrid), over
[`@astroapps/searchstate`](../astrolabe-searchstate) state.

Renders nothing. It turns a `Control<SearchOptions>` plus a set of columns into
the things a renderer needs — which column is sorted, what a header click should
do, which values a filter offers, and the current page of rows.
[`@astroapps/datagrid-fluent-ui`](../datagrid-fluent-ui) is the Fluent v9
renderer built on it.

```bash
npm i @astroapps/datagrid-search
```

## The shape of it

```tsx
const state = useControl<SearchOptions>({
  ...defaultSearchOptions,
  length: 25,
});

// ── swap this one line to move between client and server ──
const data = useClientData(state, { rows: allRows, columns });
// const data = useServerData(state, { fetch: (o, signal) => api.search(o, signal) });

const search = useGridSearch(state, { columns, data });
```

`search` is everything a renderer consumes: `sort`, `filter`, `data`,
`canFilter(column)` and `useFilterOptions(column)`. Both data hooks return the
same `GridData`, so nothing downstream can tell which mode it's in.

Two things are worth internalising:

- **One state shape, and it's yours to extend.** `Control<SearchOptions>` holds
  query, sort, filters, offset and length. URL sync, persistence and "sort by X"
  buttons elsewhere on the page all just read and write it. Real pages usually
  have filtering that isn't a column filter — a date range, a tenant, a "show
  archived" toggle — so **put those fields in the same state**:

  ```tsx
  interface FilesSearch extends SearchOptions {
    dateFrom: string | null;
    includeArchived: boolean;
  }
  const state = useControl<FilesSearch>({
    ...defaultSearchOptions,
    dateFrom: null,
    includeArchived: false,
  });
  ```

  Every hook is generic over the state, so `fetch` receives the whole thing,
  changing an extra field refetches, and the count key includes it — no `deps`
  wiring to forget. Client-side, pass `additionalFilter` to `useClientData`, since
  the library can't know what your fields mean.

- **Affordances follow column metadata.** A column with a `sortField` is
  sortable; a column whose filter options resolve is filterable. There are no
  `enableSorting` flags.

## Sorting

`SearchOptions.sort` is searchstate's `string[]`, each entry a direction
character followed by the field: `["dfile"]` is descending by `file`.

```tsx
const sort = makeGridSort(state, { mode: "shift", cycleUnsorted: false });
sort.isSortable(column); // has a sortField
sort.direction(column); // "asc" | "desc" | undefined
sort.priority(column); // 1-based, multi-sort only
sort.toggle(column, ev); // ev?.shiftKey matters in "shift" mode
```

| `mode`               | A header click                                                  |
| -------------------- | --------------------------------------------------------------- |
| `"single"` (default) | replaces any other sort — Fluent's behaviour                    |
| `"multiple"`         | keeps the others; a new column is appended as least significant |
| `"shift"`            | plain click replaces, shift-click appends                       |

`cycleUnsorted` adds the third step, so clicks go default → reverse → unsorted
instead of flipping between two.

Note what isn't here: applying the sort to rows. That belongs to the data source,
and its absence is how a server source says "these rows are already ordered".

## Filtering

`SearchOptions.filters` is `Record<string, unknown[]>`. The `unknown[]` is not
ours to narrow — the NSwag mapping from the C# side can't produce `string[]` —
so `GridFilter` applies the string typing as a _view_:

```tsx
const filter = makeGridFilter(state, { filterFor });
filter.values(field); // string[], coerced
filter.selected(field); // Control<string[] | undefined>, writable
filter.toggle(field, value, on);
filter.setValues(field, next); // removes the key when `next` is empty
filter.clear(); // or clear(field)
filter.activeFields(); // for a chip bar
```

`values()` coerces, which matters: state hydrated from a URL or an API can hold
`2` where a column renders `"2"`, and without coercion that filter would silently
match nothing. An emptied filter deletes its key rather than storing `[]`, since
an empty array is a visible difference in a URL and a different query key for an
identical search.

### Which columns filter, and how

One grid-level function, called with the whole `ColumnDef`:

```tsx
const getColumnFilter: GetColumnFilter<Row, Meta> = (column) => {
  switch (column.data?.kind) {
    case "enum":
      return { options: fetchEnumValues };
    case "number":
      return { render: RangePopup, matches: rangeMatches };
    default:
      return column.filterField ? {} : undefined;
  }
};
```

A function rather than a field-keyed map because filtering is usually
**patterned**: one rule keyed off `column.data` covers every enum column, which
is also how a schema-generated column gets its behaviour without being registered
by hand. `byFilterField({ status: {...} })` is available when you do want to
enumerate.

`{}` means "filterable, all defaults". With no `getColumnFilter` at all the
default is `column.filterField ? {} : undefined`, so the zero-config path is
unchanged.

**`getColumnFilter` must be pure.** It's called per column; returning a fresh
`options` array or `render` closure each call breaks memo dependencies downstream
and, against an async source, can loop. Results are cached per column id.

`matches` is the escape hatch for filters whose selected values aren't row values
— ranges, dates, free text. **Client-side only**: a server has to implement the
equivalent itself.

## Filter options

Four source shapes, one result:

```tsx
options: [{ value: "doc", label: "Document" }]        // static
options: async (ctx) => api.facets(ctx.field, ctx.signal)  // async, per field
options: { fromRows: () => rows, max: 50 }            // derived
options: { hook: (ctx) => makeFilterOptions(useQuery(...)) }  // your library
```

Resolution order, three deep:

|     | Source                            | Typically                                    |
| --- | --------------------------------- | -------------------------------------------- |
| 1   | `getColumnFilter(column).options` | a column that knows its own values           |
| 2   | `data.facets[field]`              | server-side: counts returned with the page   |
| 3   | `data.optionRows(field)`          | client-side: derived from the rows on screen |
| —   | nothing resolves                  | **no filter control is rendered**            |

Options load **lazily**, because `useFilterOptions` is called inside the popup
surface, which only mounts when the popover opens. Nothing is fetched for a
column nobody filters, and in-flight requests abort on unmount.

**Nothing is cached here.** State lives in the hook, so closing the popover
discards it and reopening fetches again. An internal cache only bought surviving
close/reopen, and a second caching layer can disagree with the real one — so if
you want caching, deduping, retries or stale-while-revalidate, use the `{ hook }`
source and let your query library do all of it:

```tsx
options: {
  hook: ({ field }) =>
    makeFilterOptions(
      useQuery({
        queryKey: ["facets", field],
        queryFn: () => api.facets(field),
        staleTime: 5 * 60_000,
      }),
    ),
}
```

Client-derived options ignore the column's **own** filter by default, so picking
one value doesn't hide the others — Excel's behaviour. Turn it off with
`optionsIgnoreOwnFilter: false`.

## Server-side

```tsx
const data = useServerData(state, {
  fetch: (options, signal) => api.search(options, signal),
  debounce: 300, // `query` only; sort/filter/paging fetch immediately
  keepPrevious: true, // hold the old page while the next loads
  deps: [tenantId], // extra refetch triggers
});
```

### The total is optional

Counting is usually a second query over the whole filtered set, so `GridPage.total`
is optional and `GridData.total` may be `undefined`. Three ways to handle it:

|                              | How                                                            | Cost                                                                  |
| ---------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| Return `total` with the page | one request                                                    | the count is on the critical path                                     |
| `fetchTotal`                 | runs **in parallel**; rows render first, "of N" fills in after | two requests                                                          |
| Neither                      | pager shows `1-10` and infers Next from a full page            | Next is enabled once too often, at an exact multiple of the page size |

`fetchTotal` re-runs only when something that can change a count changes — it
excludes `offset`, `length` and `sort`, so paging and sorting never pay for it
again. A failed count degrades to "uncounted" rather than failing the grid.

`undefined` and `0` are different answers: the first means "not counted", the
second "counted, nothing matched". Use `pageInfo(options, data)` rather than
reading `total` directly, and the uncounted case is handled for you.

`fetch` is held in a ref and is **not** a refetch trigger, so an inline arrow
won't loop. What drives refetching is the search state plus `deps`. Stale
responses are rejected by request sequence, so a slow earlier request can never
overwrite a fast later one.

Return facets with the page and server-side filter options need no second
request:

```ts
{ rows, total, facets: { category: [{ value: "Video", count: 12 }] } }
```

## Using another query library

`GridData` and `FilterOptions` are plain interfaces, so anything able to produce
one drives a grid:

```tsx
const options = useDebouncedSearchOptions(state, 300);
const query = useQuery({
  queryKey: ["files", options],
  queryFn: ({ signal }) => api.search(options, signal),
  placeholderData: keepPreviousData,
});
const data = makeGridData({
  page: query.data,
  loading: query.isFetching,
  error: query.error,
  reload: query.refetch,
});
```

`useDebouncedSearchOptions` is the piece a query library doesn't have: it settles
the text field before it reaches the key while letting sort and paging through
immediately, and returns a plain object usable as a key directly.

The mapping is explicit rather than a type that accepts a `UseQueryResult`,
because which loading flag you want is a real decision — with
`placeholderData` there _is_ data during a refetch, so `isPending` is false and
only `isFetching` reflects that something is happening.

## What can't be uniform across modes

Two things don't transfer when you swap client for server, and both are silent
rather than loud:

1. **Free-text `query` scope.** Client-side it searches every leaf column with a
   `getter`, joined so a query can't match across a column boundary. Server-side
   it searches whatever your API searches.
2. **`matches` predicates.** They run in JavaScript over in-memory rows. A range
   filter with a `matches` will simply not filter against an API unless the API
   implements the equivalent.

## Custom filter popups

A popup gets a `Control<string[] | undefined>` scoped to its own column, and that
is the entire contract:

```tsx
function RangePopup({ selected, values, close }: FilterPopupProps<Row>) {
  return (
    <Range
      value={values[0]}
      onApply={(from, to) => {
        selected.value = [`${from}..${to}`];
        close();
      }}
    />
  );
}
```

Pair it with a `matches` that interprets whatever string it wrote. The popup never
learns that a shared filters map exists, or that it holds `unknown[]`.

## Testing

Most of the package is plain functions over controls — `makeGridSort`,
`makeGridFilter`, `clientSearch`, `deriveFilterOptions` — testable without a DOM
or a renderer. Only the data hooks and `useFilterOptions` need React.

`makeGridSort` / `makeGridFilter` are deliberately **not** named `use*`: they read
`.value` when called, so they must run on every render and must not be memoised.
