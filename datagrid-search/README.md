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

// ── swap the data source to move between client and server ──
const data = useClientData(state, { rows: allRows, columns });
// const data = useServerData(state, { queryKey: "files", search }); // react-query

const search = useGridSearch(state, { columns, data });
```

`search` is everything a renderer consumes: `sort`, `filter`, `data`,
`canFilter(column)` and `useFilterOptions(column)`. Every source produces the same
`GridData`, so nothing downstream can tell which mode it's in.

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

`SearchOptions.filters` is `Record<string, string[]>` — filter values are always
strings. `GridFilter` is the typed accessor over it:

```tsx
const filter = makeGridFilter(state, { filterFor });
filter.values(field); // string[]
filter.selected(field); // Control<string[] | undefined>, writable
filter.toggle(field, value, on);
filter.setValues(field, next); // removes the key when `next` is empty
filter.clear(); // or clear(field)
filter.activeFields(); // for a chip bar
```

An emptied filter deletes its key rather than storing `[]`, since an empty array
is a visible difference in a URL and a different query key for an identical
search.

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

The rest of `ColumnFilter` is presentation, per column: `multiple` (default true)
for checkboxes vs radios, `searchable` for an options-search box (on past ~12
options), and `showCounts` (default true) for the `Document (3)` counts beside
each option. `showCounts: false` only hides a count — to avoid computing one, a
derived source takes `counts: false`.

### Applying immediately, or on Apply

By default every checkbox searches. `deferApply` holds the selection in the popup
instead and writes it when Apply is clicked, which also closes the popup:

```tsx
const search = useGridSearch(state, { columns, data, deferApply: true });
// three values ticked = one search, not three
```

**Grid-level, not per column** — which click searches shouldn't vary between one
funnel and the next. It lands on `search.filter.deferApply`, and `useFilterDraft`
reads it from there: a renderer asks that hook for `values` and calls
`toggle`/`clear`/`apply` without knowing which mode it's in.

Worth it against a server, where each click would otherwise be a request, two of
them already stale before they land. Closing the popup any other way discards —
there's no cancel to write, because nothing was written. Clear empties the
selection (the draft when deferred), so removing a deferred filter is Clear then
Apply.

A `ColumnFilter.render` of your own is the one exception, unavoidably: it gets the
real `selected` control and `close`, so when a selection is final is its own call —
which is what the range popup in the demo does by hand.

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

`useServerData` is the server counterpart to `useClientData`. It's built on
**react-query** (a peer dependency), so the fetching — abort on change,
stale-response ordering, keep-previous, cross-component cache sharing — is the
query library's, not a reimplementation. You provide a `search`; it returns the
same `GridData` a client grid does. Wrap the app in a `QueryClientProvider`.

```tsx
const data = useServerData(state, {
  queryKey: "files", // cache-key prefix; ["files", tenantId] to scope it
  search: (options, includeTotal, signal) =>
    api.search(options, signal, includeTotal), // returns a GridPage
  debounce: 300, // `query` only; sort/filter/paging fetch immediately
  keepPrevious: true, // hold the old page while the next loads
});
```

`search` gets the state's whole value, so a state that extends `SearchOptions` with
its own filtering is carried through — and because it's part of the query key,
changing it refetches with no extra wiring.

### The total is optional

Counting is usually a second query over the whole filtered set, so `GridPage.total`
is optional and `GridData.total` may be `undefined`. `undefined` and `0` are
different answers: the first means "not counted", the second "counted, nothing
matched" — use `pageInfo(options, data)` rather than reading `total` directly, and
the uncounted case (pager shows `1-10`, infers Next from a full page) is handled
for you.

A page's `total` also accepts `null`, so a generated response type can be returned
as-is — `SearchResults<T>`'s `int?` becomes `total: number | null`, and a null
count means the same as an absent one. `makeGridData` folds it to `undefined`, so
`GridData.total` still has exactly one "not counted" value.

`useServerData` counts **once per search**, not once per page. `includeTotal` — the
flag handed to `search` — is true only when there's no total for the current
search; the total is then cached on a key that excludes `offset`/`length`/`sort`,
so paging and sorting reuse it and a filter or query change re-counts. That
condition is "the search changed", not "offset is 0", so a restored URL like
`?offset=30` still gets its total. Honour it however suits the endpoint:

- **Cheap combined count** (`COUNT(*) OVER()`): ignore `includeTotal`, always
  return `total`. Harmless — it just counts on every page.
- **Expensive count**: return `total` only when `includeTotal`, and skip it
  otherwise. This maps straight onto a `SearchHelper`-style endpoint, whose
  `SearchResults<T>(Total, Entries)` is a `GridPage` and whose `includeTotal` is
  exactly this flag.
- **No count**: pass `count: false`. Nothing is ever asked for and nothing is ever
  reported — not even a total another grid sharing the key prefix cached, since a
  grid opts out because a total would be wrong or unwanted for it.

A `search` that's asked but returns no `total` is recorded as "asked, none came"
and not retried until the search moves; an error surfaces as `GridData.error`.

Return facets with the page and server-side filter options need no second request:

```ts
{ rows, total, facets: { category: [{ value: "Video", count: 12 }] } }
```

### Another query library, or none

`GridData` and `GridPage` are plain interfaces, so `useServerData` isn't the only
way in. Anything that produces a `GridPage` drives a grid through `makeGridData`,
and `useDebouncedSearchOptions` — the text-debounce a query library lacks — is
usable on its own:

```tsx
const options = useDebouncedSearchOptions(state, 300);
const query = useQuery({ queryKey: ["files", options], queryFn: ... });
const data = makeGridData({
  page: query.data,
  loading: query.isFetching, // not isPending: with placeholderData there *is*
  error: query.error, //         data during a refetch, so isPending is false
  reload: query.refetch,
});
```

Reach for this when you want the count wired your own way, or a library other than
react-query.

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
learns that a shared filters map exists.

## Testing

Most of the package is plain functions over controls — `makeGridSort`,
`makeGridFilter`, `clientSearch`, `deriveFilterOptions` — testable without a DOM
or a renderer. Only the data hooks and `useFilterOptions` need React.

`makeGridSort` / `makeGridFilter` are deliberately **not** named `use*`: they read
`.value` when called, so they must run on every render and must not be memoised.
