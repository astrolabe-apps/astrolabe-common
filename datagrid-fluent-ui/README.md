# @astroapps/datagrid-fluent-ui

Styles [`@astroapps/datagrid`](../astrolabe-datagrid) to look like the
[FluentUI v9](https://react.fluentui.dev) `DataGrid`, and wires up the row-level
behaviour that Fluent gets from its row elements.

Every metric in here was measured against a live Fluent v9 `DataGrid` rather than
copied from docs — see `src/app/fluentgrid/page.tsx` in the `formServer` site for
the side-by-side harness that diffs the two grids' computed styles.

## Usage — a whole table

`FluentDataTableView` is the Fluent counterpart of `astrolabe-ui`'s
`DataTableView`: a table driven by `@astroapps/searchstate` state, with sortable
and filterable header cells, per-cell reactivity scoping, and in-grid
empty/loading states.

```tsx
<FluentDataTableView
  state={searchState} // Control<SearchOptions>
  columns={columns}
  pageRows={pageRows}
  getRow={getRow}
  useFilterValues={useFilterValues}
  loading={loading}
/>
```

`FluentDataTable` is the client-side convenience version — hand it an array and
it does the query/filter/sort with searchstate's own helpers:

```tsx
<FluentDataTable data={rows} columns={columns} state={searchState} />
```

Columns need a `getter` for the free-text query, a `sortField` to be sortable,
and a `filterField` (plus `useFilterValues`) to get a filter popover.

There is deliberately **no pager**. Fluent v9 ships no pagination component, so
paging stays with whoever produces `getRow`/`pageRows`; `FluentDataTable` can
write the filtered count to a `totalRows` control to drive one.

## Usage — styling an existing grid

Must be rendered inside a `FluentProvider` so the theme's token custom
properties are in scope.

```tsx
const fluent = useFluentDataGrid<Row>({
  size: "medium",
  rows: sortedRows,
  rowKey: (r) => r.id,
  sort,
  selection,
});

const columns = [
  ...columnDefinitions<Row>(fluent.selectionColumn!),
  ...dataColumns,
];

<DataGrid {...fluent.gridProps} rows={sortedRows} columns={columns} />;
```

`gridProps` carries the classes plus `renderHeaderContent` and `wrapBodyRow`. The
pieces are also exported individually (`useFluentDataGridStyles`,
`fluentSelectionColumn`, `fluentHeaderContent`, `fluentRowWrapper`) for grids
that compose them differently.

Columns are sortable when they have a `sortField`, matching astrolabe's existing
convention.

## Sorting and selection state

State is never owned by this package. Build a `FluentSort` / `FluentSelection`
from whatever you already have:

| State you hold                | Sort                                                         | Selection                 |
| ----------------------------- | ------------------------------------------------------------ | ------------------------- |
| Plain React state             | `columnIdSort(state, setState)`                              | `arraySelection({...})`   |
| `Control` (react-typed-forms) | `controlSort(control)`                                       | `controlSelection({...})` |
| `@astroapps/searchstate`      | `searchStateSort({...})` / `controlSearchStateSort(control)` | —                         |

The searchstate adapters use its `sort: string[]` model directly — `"a"`/`"d"`
prefix plus the column's `sortField`, cycled with `rotateSort`, and `offset` reset
to 0 on change.

`rotateSort`'s own cycle has three steps (ascending → descending → **unsorted**),
one more than Fluent's. By default these adapters drop that third step so header
clicks flip ascending ↔ descending like Fluent's own DataGrid; pass
`cycleUnsorted: true` for searchstate's native behaviour, as used elsewhere in
the repo. Either way `defaultSort` picks the starting direction.

`cycleUnsorted` also matters if you render a real Fluent `DataGrid` from the same
state: its `useTableSort` is controlled from the moment `sortState` is set, so
dropping the prop to `undefined` on reaching the unsorted state flips it back to
uncontrolled and it throws (`Cannot destructure property 'sortColumn'`). Stay
controlled and pass `{ sortColumn: undefined, sortDirection: "ascending" }`
instead, or supply a `defaultSortState`.

`sortRows(rows, columns)` does client-side sorting using the columns'
comparators. Ignore it when a server sorts the data.

## columnSearching

Lives in [`@astroapps/datagrid`](../astrolabe-datagrid/src/searching.ts), not
here — it's the only glue between columns and searchstate, and it's useful well
beyond Fluent. `ColumnDef`'s `sortField` / `filterField` / `filterValue` /
`compare` / `defaultSort` describe exactly the operations searchstate performs,
and searchstate takes accessor functions (it knows nothing about columns), so
this builds those accessors and nothing needs reimplementing:

```ts
makeClientSortAndFilter(columnSearching(columns))(searchOptions, rows);
sortBySortFields(columnSearching(columns).getComparison, sort, rows);
makeFilterFunc(columnSearching(columns).getFilterValue, filters);
```

`columnFilterValues(columns, data, field)` collects a column's distinct
`[value, label]` filter options, and `rotateColumnSort(column)` cycles a column's
sort — converting `defaultSort` from `"asc"`/`"desc"` to the `"a"`/`"d"` prefix
`rotateSort` expects, which is easy to get wrong.

The `Control`-based adapters read `.value` when called, so **call them during
render** (they aren't hooks, but they need the same treatment) — that's what
registers the dependency with the calling component's control tracking.

## Peer dependencies

`@react-typed-forms/core` is required: the view components render `RenderControl`
and `useComputed`. Because this package ships built output, the consuming app's
SWC plugin can't wrap its components, so it builds with the
`@react-typed-forms/transform` Babel plugin (see `.babelrc`) — without it, control
reads inside these components throw "No active ComponentTracker".
`@astroapps/searchstate` is a
required peer because its sort helpers are used at runtime — it's a small
dependency-free package.

## Known differences from Fluent

Both are structural, not styling gaps, and neither changes rendered pixels:

- **No row box.** Fluent paints dividers, hover and selection on its row
  element. An astrolabe grid is a flat CSS grid with no row box, so the row
  wrapper is `display: contents` and those are painted on every cell instead.
  Consequences: the selection cell fills the row height (Fluent's is only as tall
  as its checkbox), and cells carry the divider (so `box-sizing: content-box`
  keeps a row's total height equal to Fluent's `cellHeight + 1px`).
- **Column sizing.** Fluent's resizable column sizing reserves a constant ~48px
  of its container and gives the rest of the slack to the last column. A CSS grid
  template distributes differently, so set the widths you want explicitly rather
  than relying on either side's slack distribution.
