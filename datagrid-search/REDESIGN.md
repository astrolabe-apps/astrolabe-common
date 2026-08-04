# Datagrid search/filter/sort redesign

Status: **proposal, awaiting review.** Nothing here is implemented yet.

Two packages:

| Package | Folder | Role |
|---|---|---|
| **`@astroapps/datagrid-search`** *(new)* | `datagrid-search/` | Headless. State → sort/filter/options → rows. No renderer, no CSS. |
| **`@astroapps/datagrid-fluent-ui`** *(rewritten)* | `datagrid-fluent-ui/` | Fluent v9 renderer over it. |

`datagrid-fluent-ui` is unpublished, so it's a free refactor. `datagrid-search`
is new. **Nothing else changes at all** — `@astroapps/datagrid`,
`@astroapps/searchstate`, `astrolabe-ui` and `astrolabe-schemas-datagrid` are all
untouched, at their committed state. The earlier in-flight dedup pass that had
added `searching.ts` to `@astroapps/datagrid` has been rolled back (§3.5), so
this starts from a clean baseline.

---

## 1. The organising idea

**One grid, one state shape, a swappable data source — and the logic in a
headless package so the renderer is interchangeable.**

`Control<SearchOptions>` stays as the state shape. Client-side vs server-side is
a choice of *source*, not of component:

```tsx
const state = useControl<SearchOptions>({ ...defaultSearchOptions, length: 25 });

// ── swap this one line to move between client and server ──
const data = useClientData(state, { rows: allRows, columns });
// const data = useServerData(state, { fetch: (o, signal) => api.search(o, signal) });

const search = useGridSearch(state, { columns, data, getColumnFilter });

<FluentDataGrid search={search} size="medium" />
```

Both hooks return the same `GridData<T>` (§4.1), so everything downstream — sort
arrows, funnels, the pager, the in-grid Loading/No-data row — is identical either
way. `GridData` being a visible, standalone value is the seam: it's the only
thing that differs between the two modes, and you can use it on its own without a
grid at all.

Nothing in `SearchOptions` needs slicing up: the narrow controls the original
goals asked for already exist as `state.fields.sort` (`Control<string[]>`,
`'a'`/`'d'` prefixed) and `state.fields.filters`
(`Control<Record<string, string[]>>`).

---

## 2. Decisions

| # | Decision | Status |
|---|---|---|
| D1 | Where does per-column filter config (options, popup, predicate) live? | **Settled: a grid-level `getColumnFilter(column)` function** (§5.4). Rejected: a `filter?: ColumnFilter<T>` field on `ColumnDef` (two of its seven fields re-spelled the existing `filterField`/`filterValue`; four were popover-UI concerns that don't belong in a layout package), and a `filterConfig` map keyed by `filterField` (enumerates every column; string keys drift silently). The function subsumes the map, sees `column.data` so schema-generated columns can be matched on their metadata, and collapses one level of options resolution. |
| D2 | Narrow `SearchFilters` to `Record<string, string[]>` in `@astroapps/searchstate`? | **Settled: no, leave it.** It is `Record<string, unknown[]>` because the NSwag type mapping has historically been unable to convert the C# representation to `string[]` — narrowing it would break the generated client contract with the .NET side. Recorded here because from the TypeScript side the `unknown[]` reads as under-specification and invites exactly this "cleanup". §5.3 handles the string-typed view instead. |
| D3 | Does `astrolabe-ui`'s `DataTableView` move onto `datagrid-search`? | **Settled: no — leave `astrolabe-ui` alone.** Not in this work and not planned. Its `src/table` stays as it is; `datagrid-search` is justified on its own terms (§3.4) rather than by a second consumer. |
| D4 | Should the grid render a pager? | **Settled: yes, suppressible.** `data.total` and `state.fields.offset/length` are right there, and today's split (`DataTableView` renders one, `FluentDataTableView` deliberately doesn't) means the server path silently has no paging UI. `pager={false}` opts out, `pager={<MyPager/>}` replaces. |
| D5 | Does client↔server need to switch at **runtime**, or only per call site? | **Settled: per call site.** So the two sources are two separate hooks (§4.2) rather than one hook branching on a discriminated union — no dead hook branch, no rules-of-hooks tension. Switching at runtime, if ever needed, means remounting: `key={mode}` on the subtree. |
| D6 | May `datagrid-search` depend on `@react-typed-forms/core`, or only `@astroapps/controls`? | **Settled: `@react-typed-forms/core`, as a peer.** `@astroapps/controls` is React-free — no `useControl`, no `useComputed` — so the alternative was reimplementing ~30 lines of subscription plumbing over `SubscriptionTracker`. Core is already a peer of `datagrid-fluent-ui`, and `useComputed` is needed regardless for consumers without the SWC control-tracking plugin (see `FluentFilterPopover.tsx:65-68`). |
| D7 | Does `columnSearching` stay in `@astroapps/datagrid`? | **Moot — dissolved by the rollback** (§3.5). With `astrolabe-ui` back at its committed state it no longer imports `columnSearching`, so nothing outside `datagrid-search` wants any of `searching.ts`. `@astroapps/datagrid` stays exactly as published and `datagrid-search` owns all of this logic. |

---

## 3. Packages

### 3.1 `@astroapps/datagrid-search` (new)

```
datagrid-search/
  src/
    types.ts      FilterOption, GridData, GridPage
    columns.ts    findColumn, leafColumns, columnSearching, columnComparator
                  — the searchstate glue, owned here (§3.6)
    sort.ts       GridSort      + makeGridSort / useSortControl
    filter.ts     GridFilter    + makeGridFilter / useFilterControl,
                                  ColumnFilter, byFilterField
    options.ts    FilterOptions + useFilterOptions, resolution order
    client.ts     clientSearch (pure) + useClientData
    server.ts     useServerData — debounce, abort, keepPrevious
    interop.ts    makeGridData, makeFilterOptions,
                  useDebouncedSearchOptions  (§4.4)
    search.ts     useGridSearch — the entry point
    index.ts
  package.json  tsconfig.json  .babelrc  .npmignore
```

- **dependencies:** none beyond what's peered.
- **peerDependencies:** `@astroapps/datagrid` (for `ColumnDef`),
  `@astroapps/searchstate`, `@react-typed-forms/core`, `react` — the same four
  `datagrid-fluent-ui` already peers, minus the Fluent ones.
- Register in `Astrolabe.TestTemplate/rush.json` alongside the existing
  `@astroapps/datagrid-fluent-ui` entry (line ~428); copy the build scripts and
  `tsconfig.json` from `datagrid-fluent-ui`, minus the JSX flags where possible.

**Renders nothing.** The only React types that appear are `ReactNode` in
`ColumnFilter.render` and `FilterPopupProps`, which are contracts the renderer
fulfils — the package ships no components.

### 3.2 Pure core, thin hook layer

Most of the logic needs no React at all, and is written as plain functions:

| Pure | Hook |
|---|---|
| `makeGridSort(state, opts)` | `useSortControl` (thin wrapper) |
| `makeGridFilter(state, opts)` | `useFilterControl` (thin wrapper) |
| `clientSearch(state, rows, columns, opts)` | `useClientData` (memo), `useServerData` (effect) |
| `resolveColumnFilter`, `byFilterField` | `useFilterOptions` (async cache) |

Today's `searchStateSort` is already a plain function, so this is how the code
wants to be written anyway. With D6 settled the split is no longer about
confining a dependency — it's for testability: everything in the left column is
testable without a DOM or a renderer, which is what Phases 1–2 rely on.

### 3.4 Why a separate package, given D3

With `astrolabe-ui` staying put, `datagrid-fluent-ui` is the only consumer — so
the split has to justify itself on other grounds:

- **The logic is worth publishing headless.** Sort/filter/options/paging over
  `SearchOptions` is useful to anything rendering a table, including consumers
  with no interest in Fluent.
- **It enforces the boundary.** In one package there is nothing stopping a
  `tokens.colorNeutralForeground3` from leaking into the filter logic; across a
  package boundary the compiler stops it. That's what keeps a future second
  renderer cheap even though none is planned.
- **Tests stay honest.** A headless package can't be tested by rendering Fluent,
  so the tests exercise the logic directly.

The cost is real and worth naming: versioning, a second README, another `rush
build` edge, and cross-package changes become two commits. See §8.

### 3.5 The rollback, and the baseline it leaves

An earlier in-flight dedup pass had added `searching.ts` to `@astroapps/datagrid`
as a shared home for logic `astrolabe-ui/src/table/index.tsx` carried inline, and
pointed both `astrolabe-ui` and `datagrid-fluent-ui` at it. **That has been rolled
back** so this work starts from scratch.

Stashed, not discarded — `stash@{0}`, restorable with
`git stash pop` (or inspect via `git stash show -p stash@{0}`):

```
pre-redesign dedup pass: astrolabe-ui inline helpers removed
+ astrolabe-datagrid searching.ts
```

Scoped to `astrolabe-ui` and `astrolabe-datagrid` only, so the untracked
`datagrid-fluent-ui/`, the demo page and the rush registration are untouched.

**What the rollback gives back**, and what it therefore means for this design:

| Rolled back | Consequence |
|---|---|
| `astrolabe-datagrid/src/searching.ts` (untracked) | Gone. All of it is authored fresh inside `datagrid-search`. |
| `export * from "./searching"` in `index.ts` | `@astroapps/datagrid`'s public surface is unchanged from published v1.2.0. |
| `@astroapps/searchstate` peer+dev dep on `@astroapps/datagrid` | `@astroapps/datagrid` stays searchstate-free. Only `datagrid-search` depends on searchstate. |
| `findColumn` / `findColumnRecurse` added to `columns.tsx` | **`@astroapps/datagrid` has no `findColumn`** — it lives in `astrolabe-ui/src/table/index.tsx`. So `datagrid-search` owns its own column traversal (§3.6). |
| `astrolabe-ui/src/table` dedup (~150 lines deleted) | `astrolabe-ui` keeps its inline `makeFilterFunc`/`rotateSort`/`sortByColumns`/`filterByQuery`/`findColumn`/`setFilterValue`. Consistent with D3: its duplication is pre-existing, not introduced or removed here. |

The payoff is that **`@astroapps/datagrid` needs no changes whatsoever** —
`datagrid-search` builds on it exactly as published. That's a cleaner boundary
than the trim-`searching.ts` plan it replaces, and it retires D7.

### 3.6 What `datagrid-search` uses from `@astroapps/datagrid`

Only stable, already-published exports: `ColumnDef`, `ColumnHeader`,
`Sortable`, `SortDirection`, `ColumnDefInit`, `columnDefinitions`, `initColumn`,
`getterToFilter`, `compareAny`, `visibleChildren`.

It owns these itself, since the published package doesn't have them:

- `findColumn` / `findColumnRecurse` — ~15 lines of `ColumnDef` tree walk, needed
  to resolve a `sortField`/`filterField` to its column.
- `leafColumns` — flattening for the free-text query scope.
- The searchstate glue that `searching.ts` held: `columnSearching`,
  `columnComparator`, `rotateColumnSort`, `sortDirectionChar`,
  `sortFieldDirection`, `columnFilterValues`. In the new design most of these stop
  being public API and become internals of `makeGridSort` / `clientSearch` /
  `useClientData`.

Yes, `findColumn` now exists in both `astrolabe-ui` and `datagrid-search`. ~15
lines of duplication is the accepted price of D3 and of leaving
`@astroapps/datagrid` alone; the alternative is a published-package change to host
a helper with two unrelated consumers.

### 3.7 `@astroapps/datagrid-fluent-ui` (rewritten)

```
datagrid-fluent-ui/
  src/
    styles.ts            (unchanged)
    rows.tsx             row wrapper — paints hover + selected
    selection.ts         GridSelection + arraySelection / useSelectionControl
                         — headless, no @fluentui imports (§3.8)
    HeaderCell.tsx       renderHeaderContent — title, sort arrow, funnel
    FilterPopover.tsx    trigger + shell + default checkbox body
    FilterOptionList.tsx exported for reuse inside custom popups
    selectionColumn.tsx  (today's selection.tsx, render half)
    Pager.tsx            over offset/length/total
    useFluentDataGrid.ts GridSearch → gridProps
    FluentDataGrid.tsx   the entry point
    index.ts
```

Deleted: `sorting.tsx`, `FluentDataTable.tsx`, `FluentDataTableView.tsx`, and
`useFluentDataGrid.tsx`'s option-bundling. `FluentFilterPopover.tsx` is renamed;
today's `selection.tsx` splits into `selection.ts` (state machine) and
`selectionColumn.tsx` (checkbox column), and `controls.ts`'s `controlSelection`
becomes `useSelectionControl` in the former — the rest of `controls.ts` goes,
since `controlSort`/`controlSearchStateSort` are superseded by `useSortControl`.

Peer deps: as today, plus `@astroapps/datagrid-search`.

### 3.8 Why selection is here and not in `datagrid-search`

Selection looks like it belongs upstream alongside sort and filter, but it
doesn't:

- **It isn't search state.** It's not in `SearchOptions`, isn't affected by sort or
  filter, doesn't participate in the client/server swap, and nothing in
  `useGridSearch` or `GridData` reads it. In `datagrid-search` it would be a
  tenant, not a member — and the package name would stop describing its contents.
- **The symmetry with sort/filter is superficial.** Those are upstream *because*
  they're driven by `SearchOptions`, which is the package's entire reason to
  exist. "A grid has three features so all three go upstream" doesn't follow.
- **No second consumer, even in principle.** `astrolabe-ui`'s table has no
  selection concept at all; only this package and the demo page use it.
- **It's ~30 lines.** If a second renderer ever appears, promoting it is cheap.

So it lives here, but in `selection.ts` with **no `@fluentui` imports** — separate
from `selectionColumn.tsx` (the checkbox column) and from `rows.tsx` (selected-row
painting). That keeps a future promotion a file move rather than a rewrite, and a
CI grep for `@fluentui` in that one file keeps it honest.

**Page-scoped is the supported default** (confirmed), matching Fluent's own
DataGrid and today's demo. Cross-page "select all 1,247 matching rows" is the one
thing that would move selection upstream, since it would need `GridData.total`,
the live `SearchOptions`, and a way to fetch every matching id — genuinely coupled
to search state. Not supported for now; `selection.ts` staying Fluent-free is what
keeps that door open.

**Fix while rewriting it.** Today's `arraySelection` has
`allSelected = rows.length > 0 && selectedIds.length >= rows.length`, comparing
*total* selected ids against the *current page's* row count. Select 3 rows, page to
another 3-row page, and the header checkbox reads checked with nothing on that page
selected — then `toggleAll` clears the lot. `toggleAll` likewise does
`onChange(rows.map(getId))`, discarding other pages' selections. Page-scoped
semantics want `rows.every(r => selectedIds.includes(getId(r)))` and
union/subtract over the current page.

---

## 4. The client/server seam

### 4.1 `GridData` — what the grid knows about its rows

```ts
export interface GridData<T> {
  rows: T[];              // the current page, ready to render
  total: number;          // filtered total, for the pager
  loading: boolean;
  error?: unknown;
  reload(): void;
  /** Default filter-option source; see §5.5. */
  filterOptions?: FilterOptionSource<T>;
  /** Spread onto <DataGrid>. */
  rowProps: { bodyRows: number; getBodyRow(i: number): T };
}
```

Both modes produce this, so the grid has one contract and never learns which
mode it's in. `loading` and `total` now come from the *same place* in both modes
— which is what today's design gets wrong (§6).

It's also the **interop surface**: `GridData` is a plain interface, so react-query
or anything else can produce one directly and drive the grid without our fetching
hooks being involved at all (§4.4).

### 4.2 The two hooks

Two hooks rather than one hook over a `ClientSource | ServerSource` union,
because D5 says the mode is fixed per call site — so there's no reason to carry a
dead hook branch or fight rules-of-hooks.

```ts
export interface ClientDataOptions<T> {
  rows: T[];
  columns: ColumnDef<T, any>[];    // for comparators + filter values
  /** True while *you* are still fetching the full array. */
  loading?: boolean;
  /** Slice to offset/length. Default true. */
  paged?: boolean;
  /** Excel-style: a column's options ignore its own filter. Default true. */
  optionsIgnoreOwnFilter?: boolean;
  maxFilterOptions?: number;
}

export interface ServerDataOptions<T> {
  fetch: (options: SearchOptions, signal: AbortSignal) => Promise<GridPage<T>>;
  /** Debounce for `query` only; sort/filter/page changes fetch immediately. */
  debounce?: number;              // default 300
  /** Keep the previous page visible while refetching. Default true. */
  keepPrevious?: boolean;
  /** Extra refetch triggers beyond SearchOptions changes. */
  deps?: unknown[];
}

export interface GridPage<T> {
  rows: T[];
  total: number;
  /** Facets returned alongside the page — filter options for free. */
  facets?: Record<string, FilterOption[]>;
}

export function useClientData<T>(
  state: Control<SearchOptions>, o: ClientDataOptions<T>,
): GridData<T>;

export function useServerData<T>(
  state: Control<SearchOptions>, o: ServerDataOptions<T>,
): GridData<T>;
```

`useClientData` needs `columns` (for `columnSearching`'s comparators and filter
values); `useServerData` doesn't, since the server did that work. That asymmetry
is the one visible difference at the call site beyond the hook name.

Client mode is `makeClientSortAndFilter(columnSearching(columns))` plus a slice,
with `loading` passed through and `total = filtered.length`. Server mode is a
debounced effect keyed on `state.value` that aborts in-flight requests on change
and unmount.

**Facets are what make filtering swap cleanly.** Most search APIs return
per-field counts with the page, so server-side filter options need no second
round trip and no per-column wiring — `facets` becomes `filterOptions`, exactly
as the client source derives them from the data. Per-column async fetching
(§5.5) stays available for APIs that can't do facets.

### 4.3 Keeping the swap painless

- **Mode is fixed per call site** (D5). Swapping means editing one line; swapping
  at *runtime* means remounting, i.e. `key={mode}` on the subtree, which also
  discards the stale page and in-flight request — the behaviour you'd want anyway.
- **Paging is uniform.** `offset`/`length` mean the same thing in both modes;
  client slices, server sends. The pager doesn't care.
- **`length` is honoured in client mode by default** (`paged: true`) — the
  opposite of today's `FluentDataTable`, where `paged` defaults off, so client
  grids silently ignore `length`.
- **What genuinely can't be uniform:** free-text `query` scope (client searches
  every column with a `getter`; a server searches whatever it searches) and
  `matches` predicates (§5.4), which a server must reimplement. Both get
  documented rather than papered over.

### 4.4 Interop: react-query, or anything else

`useServerData` owns debounce, abort and keep-previous — all of which react-query
already does better, and would fight it. So **the interop surface is `GridData`
and `FilterOptions`, not our hooks**: anything that can produce those objects
drives the grid, and `useServerData` is just one convenience producer among them.

Two factories, and one primitive react-query doesn't have:

```ts
export function makeGridData<T>(o: {
  page: GridPage<T> | undefined;
  loading?: boolean;
  error?: unknown;
  reload?: () => void;
}): GridData<T>;

export function makeFilterOptions(o: {
  options: FilterOption[] | undefined;
  loading?: boolean;
  error?: unknown;
  reload?: () => void;
}): FilterOptions;

/** SearchOptions with `query` debounced — safe to use directly as a query key. */
export function useDebouncedSearchOptions(
  state: Control<SearchOptions>, ms?: number,
): SearchOptions;
```

Searching:

```tsx
const options = useDebouncedSearchOptions(state, 300);
const q = useQuery({
  queryKey: ["files", options],
  queryFn: ({ signal }) => api.search(options, signal),
  placeholderData: keepPreviousData,
});
const data   = makeGridData({ page: q.data, loading: q.isFetching,
                              error: q.error, reload: q.refetch });
const search = useGridSearch(state, { columns, data, getColumnFilter });
```

Filter values, via the `{hook}` option source — which is called inside the popup
surface, so react-query's own cache handles open/close and the request is lazy:

```tsx
getColumnFilter={(col) => ({
  options: { hook: ({ field }) => {
    const q = useQuery({ queryKey: ["facets", field],
                         queryFn: ({ signal }) => api.facets(field, signal) });
    return makeFilterOptions({ options: q.data, loading: q.isPending,
                               error: q.error, reload: q.refetch });
  }},
})}
```

Design notes:

- **Explicit factories, not a structural `QueryLike` type.** A shape like
  `{data?, isPending?, isFetching?, error?, refetch?}` that react-query's result
  satisfies would let us accept the query object directly, but it couples us to
  react-query's naming across versions (v4's `isLoading` became v5's `isPending`)
  and it has to *guess* which flag the caller means — `isFetching` and `isPending`
  differ exactly when `keepPrevious` matters. A one-line explicit mapping at the
  call site is shorter than the docs explaining the guess.
- **Zero dependency, and no version coupling.** Both factories take plain values;
  neither library imports react-query, or knows it exists.
- **`{hook}` sources bypass our options cache** by definition — the hook owns
  caching. Worth stating in the README so it isn't read as double-caching.
- **`useDebouncedSearchOptions` is the actual value-add.** react-query has no
  notion of "debounce the text field but not the sort" — this returns a plain
  `SearchOptions`, structurally hashable as a query key, and reads `state.value`
  during render so control tracking re-renders the component when the state
  changes.
- **`makeGridData` derives `filterOptions` from `page.facets`,** so server facets
  (§4.2) work identically whether the fetch came from `useServerData` or
  react-query.
- **`useServerData` is implemented over `makeGridData`,** so there's one code path
  constructing a `GridData` rather than two that can drift.

---

## 5. API

### 5.1 Opting features in and out

Mostly implicit, from metadata that already exists:

| Feature | On when | Off when |
|---|---|---|
| Sort on a column | `sortField` set | not set |
| Filter on a column | `getColumnFilter` returns config **and** an option source resolves | either missing |
| Paging | `pager !== false` and `total > 0` | `pager={false}` |
| Selection | `selection` passed | omitted |

Grid-level blunt overrides for the rest: `sortable={false}`,
`filterable={false}`. No `enableSorting`-style flags beyond that — a grid whose
columns have no `sortField` already has no sort UI.

### 5.2 Sort

```ts
export interface GridSort {
  isSortable(col: ColumnDef<any, any>): boolean;
  direction(col: ColumnDef<any, any>): SortDirection | undefined;
  /** 1-based position, for a "sorted 2nd" badge. undefined in single mode. */
  priority(col: ColumnDef<any, any>): number | undefined;
  toggle(col: ColumnDef<any, any>, ev?: { shiftKey?: boolean }): void;
}

export interface SortOptions {
  /** "single" (Fluent's look) | "multiple" | "shift" (shift-click appends). */
  mode?: "single" | "multiple" | "shift";
  /** Include rotateSort's third "unsorted" step. Default false. */
  cycleUnsorted?: boolean;
  resetPaging?: boolean;   // default true
}

export function makeGridSort(
  state: Control<SearchOptions>,
  o?: SortOptions,
): GridSort;
```

Takes `Control<SearchOptions>` outright. An earlier draft had it structurally
typed as `Control<FilterAndSortState & Partial<SearchPagingState>>`, as
`controlSearchStateSort` was — dropped as speculative generality, since
`SearchOptions` being *the* state shape is the premise of the whole design, and
`Control<V>` is invariant in `V` so the wider type buys less than it looks.
`sortRows` comes **off** the interface —
it belongs to the client source, and its absence is how a server source says
"already ordered". `FluentSortState`/`columnIdSort`/`controlSort` are deleted;
`sortField` already defaults from the column id in `initColumn`.

Paging reset lives here and in `makeGridFilter`, so the three separate
`resetPaging` options collapse into one grid-level flag threaded to both.

### 5.3 Filters

Storage stays `SearchFilters` — i.e. `Record<string, unknown[]>`, unchanged, for
the NSwag reason in D2. The string typing is a *view* applied at this boundary:

```ts
export interface GridFilter<T = any, D = unknown> {
  filterFor(col: ColumnDef<T, D>): ColumnFilter<T> | undefined;   // cached
  isFilterable(col: ColumnDef<T, D>): boolean;
  field(col: ColumnDef<T, D>): string | undefined;
  /** Stable, writable control for one field — what a custom popup owns. */
  selected(field: string): Control<string[] | undefined>;
  /** `selected(field).value` coerced to strings. */
  values(field: string): string[];
  /** Replaces a field's values, removing the key entirely when empty. */
  setValues(field: string, next: string[]): void;
  toggle(field: string, value: string, on: boolean): void;
  active(field: string): boolean;
  clear(field?: string): void;   // omit ⇒ clear all
  activeFields(): string[];      // for a chip bar / "clear all"
}
```

**What the spike settled** (§8's first risk, now closed). `filters.fields[key]` for
an absent key:

- **does** return a control, created lazily, with **stable identity** across reads
  — so it's safe as a memo dep;
- reads `undefined`, not `[]`;
- **reading it does not touch the parent value** — merely rendering a popover
  can't mutate the search state;
- but **writing `[]` through it does** add an empty array to `filters`.

That last point rules out the eager normalisation the earlier draft assumed. An
empty array is functionally harmless (`makeFilterFunc` skips empty entries) but it
is a visible difference in a URL and a *different react-query key for an identical
search*. So nothing is seeded. Instead:

- `selected(field)` is typed honestly as `Control<string[] | undefined>`;
- `values(field)` is the read path, and it **coerces to strings** —
  `stored.every(v => typeof v === "string") ? stored : stored.map(String)`,
  returning the original array when it can so callers keep referential stability;
- `setValues`/`toggle` **delete the key** when the result is empty.

Coercing at the read boundary rather than in each predicate is a change from the
earlier draft, and a better one: it makes the `string[]` claim true everywhere at
once. Necessary because `SearchFilters` is `unknown[]` (D2), so state hydrated from
a URL or an API can hold numbers or booleans — without it a hydrated `2` would
never match a rendered `"2"` and the filter would silently exclude everything.

Two related notes:

- **`Control.as()` can't do the narrowing.** `as<V2>()` is
  `V extends V2 ? Control<V2> : never`, so it widens
  (`Control<string[]>.as<unknown[]>()`) but not narrows —
  `Control<unknown[]>.as<string[]>()` is `never`. One unchecked cast inside
  `makeGridFilter`, which is why it belongs there and not at call sites.
- **Writes need no cast,** a small improvement on today: `setFilterValue` already
  takes `unknown`. The cast at `astrolabe-ui/src/table/FilterPopover.tsx:49` only
  exists because `SearchingState` declares `string[]` where searchstate declares
  `unknown[]`; using `SearchOptions` directly removes the mismatch.

Giving a custom popup a control scoped to its own column is the centre of the
filtering design: a date-range popup writes `["2026-01-01..2026-03-01"]`, a numeric
one writes `[">100"]`, and neither learns that a shared filters map exists — or
that it's `unknown[]` underneath.

### 5.4 `getColumnFilter` — per-column behaviour, no `ColumnDef` change

One grid-level function, called with the whole `ColumnDef`, returning how that
column filters — or `undefined` for "doesn't":

```ts
export interface ColumnFilter<T> {
  /** Filter key. Defaults to `column.filterField ?? column.id`. */
  field?: string;
  options?: FilterOptionSource<T>;
  /** Row predicate. Defaults to `values.includes(filterValue(row)[0])`. */
  matches?: (row: T, values: string[]) => boolean;
  render?: (props: FilterPopupProps<T>) => ReactNode;
  multiple?: boolean;    // default true
  searchable?: boolean;  // options-search box; default when options > 12
}

export type GetColumnFilter<T, D = unknown> =
  (column: ColumnDef<T, D>) => ColumnFilter<T> | undefined;
```

A function rather than a field-keyed map because filtering is usually
**patterned, not per-column** — one rule covers many columns:

```tsx
getColumnFilter={(col) => {
  switch (col.data?.type) {
    case "enum": return { options: enumOptions(col.data) };
    case "date": return { render: DateRangePopup, matches: dateRangeMatches };
    default:     return col.filterField ? {} : undefined;
  }
}}
```

Because the function receives `column.data` (typed as `D`), this is also how a
schema-generated column derives filter behaviour from its schema field instead of
being registered by hand — what `astrolabe-schemas-datagrid` would need
(`columnAdornment.ts:69` already exposes `filterField` as an adornment).

`{}` means "filterable, everything defaulted", so the zero-config path is
unchanged: with no `getColumnFilter`, the default is
`col => col.filterField ? {} : undefined`.

Enumerating by field stays available as sugar over the same mechanism:

```tsx
getColumnFilter={byFilterField({
  status: { options: STATUS },
  price:  { matches: rangeMatches, render: RangePopup },
})}
```

and rules compose: `getColumnFilter={col => byType(col) ?? byField(col)}`.

**Must be pure and cheap.** It's called per column, and a freshly built `options`
array or `render` closure each call would break memo deps downstream — worst case
a refetch loop on an async source. `useGridSearch` caches the result per column
id keyed on the `columns` array, so a stable function runs once per column per
columns-change; the purity requirement still goes in the README, because the
failure mode is silent.

`matches` is the only genuinely new capability — it makes range/date/text filters
work, can't be expressed through `filterValue`, and is the counterpart of the
existing `compare?: (a, b) => number`. **Client mode only**; a server must
implement the equivalent itself.

`FilterOption` is a superset of the `[value, label]` tuple — the options layer
widens it where it needs `count`/`disabled`, so `@astroapps/datagrid` needs no
change for that either.

> **No equivalent for sort, deliberately.** `ColumnDef` already carries
> everything per-column sorting needs — `compare`, `getter`, `defaultSort`,
> `sortField` — so a `getColumnSort` would have nothing to supply. Filtering
> needs *UI* per column (options source, popup); sorting doesn't.

### 5.5 Filter options — lazy, and uniform across modes

```ts
export interface FilterOption {
  value: string; label?: string; count?: number; disabled?: boolean;
}

export type FilterOptionSource<T> =
  | FilterOption[]                                            // static
  | ((ctx: FilterOptionsContext) => Promise<FilterOption[]>)   // async, per field
  | { fromRows: () => T[]; max?: number; counts?: boolean }    // derived
  | { hook: (ctx: FilterOptionsContext) => FilterOptions };    // react-query — §4.4

export interface FilterOptionsContext {
  field: string;
  /** Other columns' filters — for cascading/dependent options. */
  filters: SearchFilters;
  query: string | null;
  signal: AbortSignal;
}

export interface FilterOptions {
  options: FilterOption[];
  loading: boolean;
  error?: unknown;
  reload(): void;
}
```

**Laziness falls out of the DOM.** `useFilterOptions` is called inside the popup
surface, which only mounts on open — no fetch until the funnel is clicked, none
at all for a column nobody filters. Contrast today, where `useFilterValues` runs
in the header render callback for every filterable column on every render.

Async results cache in a `Control<Record<string, FilterOptions>>` owned by
`useGridSearch`, so they survive close/reopen; `reload()` invalidates; in-flight
requests abort via `ctx.signal`. The `{hook}` variant **bypasses that cache** —
whatever library the hook wraps is doing the caching (§4.4).

Resolution order per column, three-deep: `getColumnFilter(col)?.options` →
`data.filterOptions` (client-derived, or server facets) → **none**, and none
means the funnel isn't rendered. An earlier draft had a fourth level — a separate
grid-level `getFilterOptions(ctx)` — made redundant by `getColumnFilter`, which
already covers both the per-column and the pattern case.

### 5.6 Custom popups — three levels

```ts
export interface FilterPopupProps<T = any> {
  column: ColumnDef<T, any>;
  field: string;
  selected: Control<string[]>;   // write here, that's the whole contract
  options: FilterOptions;
  search: Control<string>;
  close(): void;
}
```

1. `getColumnFilter(col).render` — replaces the popup **body**, keeping the
   standard trigger and the loading/error/empty shell. *(the per-column hook)*
2. grid-level `renderFilterPopup?: (props) => ReactNode` — same, as the default.
3. grid-level `renderFilterControl?: (col, filter) => ReactNode` — replaces
   button **and** popup, for a column wanting an inline toggle.

`FluentFilterPopover`, `FilterOptionList` and `useFilterOptions` stay exported
individually, so a custom popup can reuse the checkbox list and add a header.

### 5.7 Composition

`useGridSearch` is the headless entry point; the renderer consumes its result:

```ts
export interface GridSearch<T, D = unknown> {
  state: Control<SearchOptions>;
  columns: ColumnDef<T, D>[];
  sort: GridSort;
  filter: GridFilter;
  data: GridData<T>;
  useFilterOptions(field: string): FilterOptions;
  filterFor(col: ColumnDef<T, D>): ColumnFilter<T> | undefined;  // cached
}

export interface GridSearchOptions<T, D = unknown> {
  columns: ColumnDef<T, D>[];
  /** From useClientData or useServerData — the client/server seam (§4). */
  data: GridData<T>;
  getColumnFilter?: GetColumnFilter<T, D>;
  sort?: SortOptions;
  resetPaging?: boolean;   // default true, threaded to sort and filter
}

export function useGridSearch<T, D = unknown>(
  state: Control<SearchOptions>,
  options: GridSearchOptions<T, D>,
): GridSearch<T, D>;
```

`data` comes in prebuilt rather than `useGridSearch` taking a source and calling
the hook itself. That's what keeps the client/server choice a visible line at the
call site (§1) instead of a nested option, and it means `GridData` is usable on
its own — a search page with no grid at all can call `useClientData` for its rows.

Then in Fluent:

```tsx
<FluentDataGrid search={search} size="medium" pager noData="Nothing here" />
```

or à la carte, for grids that need to own the `<DataGrid>` call:

```tsx
const fluent = useFluentDataGrid(search, { size, selection });
<DataGrid {...fluent.gridProps} {...search.data.rowProps}
          columns={fluent.columns(search.columns)} />
```

`fluent.columns(cols)` prepends the selection column, retiring the caller-side
merge at `FluentDataTableView.tsx:122-127`. `FluentDataGrid` takes a prebuilt
`search` rather than duplicating a dozen option props — and a caller wanting a
toolbar (clear-all-filters, result count) needs the object anyway.

No React context: feature objects are built during render and captured in the
`renderHeaderContent` closure, so `gridProps` stays a plain spread. The only
shared mutable state is the filter-options cache, inside `useGridSearch`.

---

## 6. What's wrong with the current API

For checking the redesign against, rather than taking it on faith:

| Problem | Where |
|---|---|
| **Client and server are different components** with different props. Swapping means changing the component, moving `loading` in, rewiring `totalRows` out. | `FluentDataTable.tsx` vs `FluentDataTableView.tsx` |
| `totalRows` is pushed out through an effect; `loading` is pushed in as a prop. Two directions, two mechanisms, for one pair of facts about the same page. | `FluentDataTable.tsx:78-80`, `FluentDataTableView.tsx:56` |
| `useFilterValues: (field) => [string,string][]` is a hook called from a render callback for every filterable column on every render. Can't be async, can't be per-column. Building one needs an eslint-disable. | `FluentDataTableView.tsx:55,162`, `FluentDataTable.tsx:83` |
| Filter popup is hardcoded — no per-column override. | `FluentDataTableView.tsx:166` |
| `FluentSort` bundles storage adapter + toggle policy + `sortRows` (a data concern), so there's a `sortRows` that's the identity function whenever sort is absent — and no way for a server source to say "already sorted". | `sorting.tsx:24-36`, `useFluentDataGrid.tsx:95` |
| Two sort wire formats for one concept. | `sorting.tsx:38-78` |
| `resetPaging` is an option on three separate things. | `FluentDataTableView.tsx:69`, `controls.ts:64`, `FluentFilterPopover.tsx:47` |
| No debounce anywhere — fine client-side, a fetch per keystroke server-side. | — |
| `[value, label]` tuples: no counts, no disabled. | `columnBuilder.tsx:97` |
| Caller hand-merges the selection column. | `FluentDataTableView.tsx:122-127` |
| All of the above logic is Fluent-coupled — `datagrid-search` unpicks that, though `astrolabe-ui`'s parallel implementation stays as it is (D3). | `astrolabe-ui/src/table/*` |

---

## 7. Phases

### Phase 0 — scaffold `datagrid-search` ✅ **done**
`package.json`, `tsconfig.json`, `.npmignore`, `.gitignore`, `jest.config.js`,
`rush.json` entry, `src/types.ts` + `src/index.ts`, `test/types.test.ts`.
This document moved here from `datagrid-fluent-ui/`.

**Acceptance met:** `rush update` and
`rush build --to @astroapps/datagrid-search` clean (one expected
"Generated an empty chunk" warning — no runtime code yet); `rushx test` green.

Four notes from doing it:

- ~~**No `.babelrc`.**~~ **Wrong — corrected in Phase 2.** It applies
  `@react-typed-forms/transform` like every other library here. The original
  reasoning ("ships no components, so it must not depend on the consumer's build
  setup") confused two different builds: `.babelrc` governs *this* package's own
  compilation by microbundle. And the substitute it named was not one —
  `useComputed` keeps a derived control's value fresh, but turning a `.value` read
  into a re-render is `useComponentTracking()`'s job, which is precisely what the
  transform injects. Phase 2's hooks read state, so the omission broke them
  outright; the types-only Phase 0 just never exercised it.
- **Tests import from `@jest/globals`,** matching the repo convention
  (`core/test/dirty.test.ts:1`) rather than ambient `@types/jest`. It also needs
  declaring in `devDependencies` — pnpm's strict isolation doesn't hoist it, so
  jest resolving without it is not something to rely on.
- **`tsconfig.json`'s `include` is `src/**` only,** so `test/` is outside the
  typecheck and only ts-jest compiles it. Same as `core`. Worth knowing before
  wondering why a broken test file doesn't fail the build.
- **`src/types.ts` carries the three settled contracts** — `FilterOption`,
  `GridPage`, `GridData` (+`GridRowProps`) — rather than leaving `index.ts` empty.
  They're declarations of decisions already made in §4.1/§4.2, no logic, and it
  gives the build and the smoke test something real to check. The smoke test
  asserts a `GridData` can be built by hand, which is the claim §4.4's react-query
  interop rests on.

### Phase 1 — columns glue, sort, filter, options ✅ **done**
`columns.ts`, `sort.ts`, `filter.ts`, `options.ts` (`types.ts` landed in Phase 0).
90 tests, 100% line coverage, `tsc --noEmit` clean.

**Re-sliced:** `useFilterOptions` — the caching/aborting hook — moved to Phase 2.
Phase 1 is now *entirely pure functions with no React import at all*, which is the
left-hand column of §3.2 exactly, and is why its tests need no DOM or renderer.
The async cache, abort and resolution-order-with-`data.filterOptions` tests move
with it, since they can't be written without the hook.

**Also settled while implementing:**

- `makeGridSort` and `makeGridFilter` are plain functions, not `use*` hooks. They
  read `.value` at call time, so they must run on every render and must *not* be
  memoised — naming them `use*` would have implied the opposite. The only thing
  worth memoising is `columnFilterResolver`, and that belongs in `useGridSearch`.
- `columnSearching` takes an optional `getFilterValue` override. Needed because
  `getColumnFilter` decides a column's filter field and predicate, so the filter
  layer has to be able to supply the accessor rather than have `filterField`
  assumed. Without it, a column whose `field` differs from its `filterField`, or
  which uses `matches`, would silently not filter client-side.
- `deriveFilterOptions`' `max` bounds *distinct values* and stops scanning there,
  so counts only cover rows up to the cap. Same trade the previous implementation
  made; now pinned by a test so it's a decision rather than a surprise.
**Acceptance:** unit tests, no DOM needed (§3.2) — the sort cycle
(single/multiple/shift × `cycleUnsorted` × `defaultSort: "desc"`), absent-key
normalisation in `GridFilter.selected`, a filter hydrated with `[2, true]`
still matching rows rendering `"2"`/`"true"` (the §5.3 coercion), paging reset,
option-source resolution order including the async cache and abort, and a
call-count assertion that `getColumnFilter` runs once per column per
columns-change (the §8 refetch-loop guard). Plus `git status` showing
`astrolabe-datagrid` and `astrolabe-ui` still clean — the standing check that this
work stays inside its two packages (§3.5).

### Phase 2 — the hooks: data seam and options ✅ **done**
`client.ts`, `server.ts`, `interop.ts`, `useFilterOptions.ts`, `search.ts` — the
right-hand column of §3.2. 147 tests total, 99.4% line coverage, `tsc --noEmit`
clean, build clean.

**Acceptance met**, including the headline: `useClientData` and a stub-backed
`useServerData` produce identical `GridData` across six searches (defaults, sort,
filter, query, second page, all at once). Also covered: one fetch per keystroke
burst; sort/filter/paging bypassing the debounce; a stale response never winning;
abort on change and on unmount; `keepPrevious` on and off; async options not
fetching until the popup mounts, caching across close/reopen, and refetching when
another column's filter changes.

**Corrections and decisions:**

- **`.babelrc` added** — see the Phase 0 note above for why omitting it was wrong.
  Tests are compiled by ts-jest, which doesn't apply the transform, so the test
  probes call `useComponentTracking()` by hand. That's exactly what the transform
  injects, so the tests exercise the real path rather than a shim.
- **`GridData.filterOptions` replaced by `facets` + `optionRows`.** The plan had a
  single `FilterOptionSource<T>`, which can't express server facets — those are
  already computed *per field*, while client options need the column's accessor
  applied to rows. So the data source supplies raw material in whichever form it
  has, and `useFilterOptions` resolves. `optionRows(field)` takes the field so the
  client source can exclude that field's own filter.
- **`useFilterOptions` takes the column, not the field.** It needs the column
  anyway for the value accessor; passing the field would have meant a lookup.
- **`ServerDataOptions.fetch` is held in a ref and is not a refetch trigger.**
  Otherwise an inline `fetch={(o, s) => api.search(o, s)}` — the obvious way to
  write it — would refetch on every render forever. Refetching is driven by the
  search state plus `deps`. There's a test for exactly this.
- **Stale responses are rejected by request sequence, not by abort alone,** since
  an abort can lose the race against a `.then` already queued as a microtask.
- **`canFilter(column)`** added to `GridSearch`, so the renderer can decide whether
  to show a funnel without mounting a popup to find out.
- **A column's option source *kind* must not change between renders** — the
  `{ hook }` variant is invoked as a hook, so switching kinds would reorder hooks.
  Documented on `useFilterOptions`; true of every real use, not enforced.
**Acceptance:** given the same `SearchOptions` and equivalent data, all three
producers — `useClientData`, a stub-backed `useServerData`, and `makeGridData`
fed a hand-built query-shaped object — yield identical `GridData` (rows, total,
`rowProps`, `filterOptions` from facets). Plus: one fetch per keystroke burst; an
aborted fetch never sets state; a stale response never wins; `keepPrevious` holds
rows across a refetch; and `useDebouncedSearchOptions` delays only `query`,
passing sort/filter/paging changes through immediately.

### Phase 3 — Fluent renderer ✅ **done**
`HeaderCell.tsx`, `FilterPopover.tsx`, `FilterOptionList.tsx`, `selection.ts`,
`selectionColumn.tsx`, `Pager.tsx`; `styles.ts` gained three classes, `rows.tsx`
took the new selection type. Deleted `sorting.tsx`, `controls.ts`,
`FluentFilterPopover.tsx` — **and** `FluentDataTable.tsx`,
`FluentDataTableView.tsx`, `useFluentDataGrid.tsx`, which Phase 4 was going to
remove (see the re-slice below).

**`datagrid-fluent-ui` compiles again** — `tsc --noEmit` and `rush build` clean,
14 selection tests passing. Jest was added to this package too, mirroring
`datagrid-search`'s config.

**Re-sliced:** Phase 3 now ends with a *green* package rather than a set of parts,
so the old composition files had to go with it — they import the deleted modules,
and leaving them would have kept the build red through another phase. Phase 4 is
therefore purely additive: `useFluentDataGrid` + `FluentDataGrid` on top of green
parts. The style-diff acceptance moves to Phase 5, where the demo page that runs
it actually exists; it was never checkable here.

**Notes:**

- **`ColumnFilter.render` returns `ReactNode`, not `unknown`.** Phase 1 typed it
  `unknown` to keep React out of the headless package; §3.1 had said `ReactNode`
  was the one type allowed to cross, and it was right — `unknown` only pushes a
  cast into every renderer, and it broke the build the first time a renderer used
  it. `react` is already a peer dep and the import is type-only.
- **The popup body is a separate component** (`FilterPopoverBody`), mounted by
  `PopoverSurface` only when open. That's what makes an async option source lazy;
  it's structural, not arranged.
- **`styles.ts` gained `sortPriority`, `filterButton`, `filterButtonActive`.**
  The first has no Fluent counterpart, since Fluent's DataGrid is single-sort — it
  follows Fluent's caption sizing rather than inventing a look.
- **Selection page-scoping is now pinned by three tests** named after the bug
  they'd catch (§3.8): an unchecked header on a page with nothing selected,
  `toggleAll` adding rather than replacing, and clearing one page leaving the
  other's selection intact.
- `selection.ts` imports no `@fluentui`, keeping the §3.8 door open.

### Phase 4 — composition ✅ **done**
`useFluentDataGrid.tsx` (→ `gridProps`, columns with the selection column
prepended, `parts`) and `FluentDataGrid.tsx` (the entry point). 25 tests in this
package, `tsc --noEmit` and `rush build` clean.

**Acceptance met:** a grid whose columns carry no `sortField` and no filter
config renders plain — no `aria-sort`, no sort icon, no funnel, no pager, no
selection column — and the same columns with `sortField`/`filterField` get exactly
one funnel (the filterable column), `aria-sort` on the sorted one, a pager once
`total > length`, and "No data" when a query matches nothing. 12 tests, which
exercise the whole stack: `useClientData` → `useGridSearch` → renderer → DOM.

**Notes:**

- **Test reactivity is limited to first render.** ts-jest doesn't apply
  `@react-typed-forms/transform`, so the harness installs
  `useComponentTracking()` by hand — but only for the component that calls it, and
  React renders children after a parent returns, so nested components in the
  package's own tree aren't tracked under test. That's enough to assert *what a
  render produces*, which is the acceptance criterion; click-to-sort belongs to the
  demo harness (Phase 5), which runs through the real build. Worth knowing before
  writing an interaction test here and being puzzled.
- **`FluentDataGridBundle`** is the name of `useFluentDataGrid`'s return type, since
  `FluentDataGrid` is the component.
- **The pager hides itself** when `total <= length` and `offset === 0`, rather than
  rendering a dead prev/next pair. `pager={false}` suppresses it outright and
  `pager={<MyPager/>}` replaces it (D4).
- **The selection column isn't memoised.** `selection` is rebuilt every render by
  design — it reads `.value` — so a memo keyed on it would never hit; building one
  column is cheaper than the bookkeeping to avoid it.
- **`wrapBodyContent` still wraps cells in `RenderControl`.** Cell content comes
  from a render callback outside any component, so a control read there needs a
  component to live in — and it scopes the read to one cell rather than the grid.

### Phase 5 — demo harness + READMEs
`.../formServer/src/app/fluentgrid/page.tsx` currently imports
`FluentDataTable`, `FluentSortState`, `controlSort`, `controlSearchStateSort`,
`controlSelection`, `useFluentDataGrid` — all gone. Rewrite, and add:
- **a client/server toggle over one grid**, against a fake latency+facets API
  over the same array. The headline acceptance test: flipping it changes nothing
  visible but the spinner. Per D5 the two hooks can't alternate inside one
  component, so this is two sibling components sharing one `state` control,
  picked by `key={mode}` — which is also the worked example of the runtime-switch
  pattern for the README.
- a sort-only grid and a filter-only grid (opt-out by metadata).
- an async-per-column-options column.
- a `getColumnFilter` that matches on `column.data` rather than by field, since
  that's the pattern case D1 exists for.
- a custom-popup column — numeric range, exercising `Control<string[]>` +
  `matches` together.
- **a react-query-driven grid** (§4.4): `makeGridData` over `useQuery` for the
  page, and `makeFilterOptions` over `useQuery` inside a `{hook}` option source
  for one column's values. `@tanstack/react-query` goes in the **demo site's**
  devDependencies only — neither library gains a dependency. Worth doing with the
  real library rather than a stand-in, since the hvams `rmi` site is the consumer
  this interop exists for.

READMEs for both packages, including the two things that can't be uniform
across modes (§4.3) and the options resolution table.
**Acceptance:** all of the above work in the browser; style diff still clean.

**`astrolabe-ui` is out of scope entirely (D3).** `astrolabe-ui/src/table` keeps
its own `FilterPopover`/`SortableHeader`/`useClientSideFilter`, and the
duplication between it and `datagrid-search` is accepted, not scheduled. Phase 5
is the last phase.

---

## 8. Risks

- ~~**`Control<Record<string, unknown[]>>.fields[key]` for an absent key.**~~
  **Closed by the Phase 1 spike** — see §5.3. The control is created lazily with
  stable identity, reading doesn't mutate the parent, and no proxy control was
  needed. The one surprise was that *writing* `[]` adds an empty array to the
  state, which is why nothing is seeded and `setValues` deletes instead.
- **Server mode has real concurrency.** Debounce, abort, out-of-order responses
  and `keepPrevious` are where the bugs will live, and they're invisible in the
  client path — a stale response must never win. Phase 2's tests are the
  mitigation and the ones most worth writing carefully.
- **The swap is only *mostly* seamless.** Query scope and `matches` can't
  transfer to a server (§4.3). The honest version is "one line to swap, two
  behaviours to reimplement server-side" — README, not silence, or a range filter
  silently no-ops against an API.
- **`getColumnFilter` must be pure** (§5.4). A fresh `options` array or `render`
  closure per call breaks memo deps; against an async source, worst case is a
  refetch loop. Cached per column id, but the failure mode is silent.
- **`datagrid-search` has exactly one consumer** (D3), so its overhead —
  versioning, a second README, another `rush build` edge, cross-package changes
  as two commits — buys boundary enforcement and testability rather than reuse
  (§3.4). Accepted deliberately; noted so the trade-off is on the record rather
  than rediscovered. The related risk is **API drift**: with one consumer it's
  easy to shape `datagrid-search` around exactly what Fluent needs and only find
  out later that it wasn't renderer-agnostic. Cheapest guard is to keep
  `ReactNode` the only React type crossing the boundary (§3.1) and to grep the
  package for `@fluentui` in CI.
- **Duplication with `astrolabe-ui/src/table` is now permanent** (D3), so a bug
  fixed in one won't be fixed in the other. Worth a pointer comment in each
  direction so the next person knows the sibling exists.
- **Options resolution is three-deep** (§5.5), down from four. Still the most
  likely thing to confuse someone later: one table in the README plus the "no
  source ⇒ no funnel" rule stated explicitly.
- **The `string[]` view over `unknown[]` storage is a claim, not a guarantee**
  (§5.3). It holds for anything the grid writes; state hydrated from a URL or the
  API can hold numbers or booleans. Mitigated by coercing in the default
  predicate, but a custom `matches` that assumes strings will be wrong on
  hydrated state — worth a line in the README.
- **`datagrid-fluent-ui`'s current source won't compile until Phase 3.** It
  imports `columnSearching`, `columnComparator`, `rotateColumnSort`,
  `sortDirectionChar`, `sortFieldDirection` and `columnFilterValues` from
  `@astroapps/datagrid`, all of which the rollback removed. Expected — those files
  are being deleted — but it means the package is red between now and Phase 3, so
  a green `rush build` isn't available as a progress signal until then. Building
  `datagrid-search` alone (`rush build --to @astroapps/datagrid-search`) is the
  check to use for Phases 1–2.
- **The stash is the only copy of the dedup pass.** `stash@{0}` holds the
  `astrolabe-ui` deduplication and the original `searching.ts`. It's referenced as
  Phase 1's reference material (§3.6), so don't drop it until Phase 3 lands. If
  the `astrolabe-ui` dedup is wanted eventually, it's a separate piece of work
  from this one — it was only entangled because both touched `searching.ts`.

**All decisions are settled; the baseline is clean and the plan is ready to build.**
