# @astroapps/datagrid-fluent-ui

Styles [`@astroapps/datagrid`](../astrolabe-datagrid) to look like the
[FluentUI v9](https://react.fluentui.dev) `DataGrid`, and wires up the row-level
behaviour Fluent gets from its row elements.

The searching — sort, filter, paging, filter options, client vs server — belongs
to [`@astroapps/datagrid-search`](../datagrid-search). This package renders what
that gives it and adds no logic of its own. Read its README for how the state
works; this one covers the Fluent side.

Every metric here was measured against a live Fluent v9 `DataGrid` rather than
copied from docs — see `src/app/fluentgrid/page.tsx` in the `formServer` site for
the harness that diffs the two grids' computed styles, and
`src/app/fluentgrid/features/page.tsx` for a tour of the search features.

```bash
npm i @astroapps/datagrid-search @astroapps/datagrid-fluent-ui
```

## A whole grid

```tsx
const state = useControl<SearchOptions>({
  ...defaultSearchOptions,
  length: 25,
});
const data = useClientData(state, { rows, columns }); // or useServerData
const search = useGridSearch(state, { columns, data });

<FluentDataGrid search={search} size="medium" rowKey={(r) => r.id} />;
```

That's a sortable, filterable, paged grid. Everything it renders follows from the
search rather than a flag:

| Affordance       | Appears when                                                    |
| ---------------- | --------------------------------------------------------------- |
| Sort arrow       | the column has a `sortField`                                    |
| Multi-sort badge | sort `mode` isn't `"single"` and more than one column is sorted |
| Filter funnel    | the column's filter options resolve (see datagrid-search)       |
| Pager            | `data.total` exceeds one page                                   |
| Selection column | a `selection` is passed                                         |

So a grid whose columns carry none of that renders as a plain table. Grid-wide
off switches exist for the blunt cases: `sortable={false}`, `filterable={false}`,
`pager={false}`.

Must be rendered inside a `FluentProvider`.

### Props beyond the search

```tsx
<FluentDataGrid
  search={search}
  size="medium" // "medium" | "small" | "extra-small"
  rowKey={(r) => r.id}
  selection={selection}
  noData="Nothing here"
  pager // false to suppress, or a node to replace
  pageSizes={[10, 25, 50]}
  renderFilterPopup={(props) => <MyBody {...props} />}
  renderFilterControl={(column, search) => <MyInlineFilter />}
/>
```

`DataGridClasses` props (`className`, `cellClass`, …) pass through and win over
the Fluent defaults.

## Composing it yourself

When you need to own the `<DataGrid>` call — extra header rows, a custom body
wrapper — use the hook and spread its parts:

```tsx
const fluent = useFluentDataGrid(search, { size, selection, rowKey });

<DataGrid
  {...fluent.gridProps}
  columns={fluent.columns} // selection column already prepended
  bodyRows={search.data.rowProps.bodyRows}
  getBodyRow={search.data.rowProps.getBodyRow}
/>;
```

`gridProps` carries the classes, `renderHeaderContent`, the row wrapper and the
per-cell `RenderControl` wrapper. `fluent.parts` exposes the part classes, for
building custom cells that still look like Fluent's.

The pieces are also exported individually — `useFluentDataGridStyles`,
`fluentHeaderContent`, `fluentRowWrapper`, `fluentSelectionColumn`,
`FluentFilterPopover`, `FilterOptionList`, `FluentPager` — for grids that need to
compose them differently.

## Selection

**Page-scoped**: the header checkbox reflects and acts on the rows currently
rendered, and never disturbs a selection made on another page.

```tsx
const selectedIds = useControl<string[]>([]);
const selection = makeGridSelection({
  selected: selectedIds,
  rows: data.rows, // the current page
  getId: (r) => r.id,
});
```

`arraySelection` is the same thing over plain state. Neither is a hook, despite
taking a control — they read `.value` when called, so call them during render.

Cross-page "select all N matching" is deliberately not supported: it needs the
filtered total, the live search, and a way to fetch every matching id, at which
point selection stops being a renderer concern.

## Custom filter popups

Three levels, most specific first:

1. `getColumnFilter(column).render` — replaces one column's popup **body**,
   keeping the standard funnel and the loading/error/empty shell.
2. `renderFilterPopup` on the grid — the same, as the default for every column.
3. `renderFilterControl` on the grid — replaces the funnel **and** popup, for a
   column that wants an inline control instead.

The body receives `FilterPopupProps`, whose whole contract is a
`Control<string[] | undefined>` for that column. `FilterOptionList` is exported so
a custom body can keep the standard checkbox list and just add a header.

The body is a separate component mounted only while the popover is open, which is
what makes an async option source lazy.

## Styling

`useFluentDataGridStyles` returns the classes; the grid contributes no CSS of its
own beyond them. Stable class names are on `fluentDataGridClassNames`, for CSS
overrides and for tests that measure rendered cells.

Sizes match Fluent's: body rows are 44/34/32px of content, the header row is 32px
at every size, and `extra-small` drops the row divider and uses 12px text.

Two structural differences from Fluent worth knowing:

- **No row box.** The row wrapper is `display: contents`, so cells stay direct
  grid items and keep their explicit placement. Hover and selection are painted on
  the cells rather than the row — `:hover` still resolves up the ancestor chain.
- **Column widths.** Fluent's resizable column sizing reserves a constant ~48px of
  the container and gives the slack to the last column, which a CSS grid template
  won't reproduce. Set the widths you want explicitly rather than letting either
  side distribute slack.

## Pager

Fluent v9 ships no pagination component, so `FluentPager` is built from its
primitives rather than matching a reference. It renders prev/next over
`offset`/`length` with an optional page-size selector, and hides itself when
everything fits on one page.

## Migrating from the previous API

| Before                                             | Now                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| `FluentDataTable`                                  | `FluentDataGrid` + `useClientData`                                    |
| `FluentDataTableView`                              | `FluentDataGrid` + `useServerData`                                    |
| `useFluentDataGrid({sort, rows, …})`               | `useFluentDataGrid(search, {…})`                                      |
| `controlSearchStateSort(state)`                    | `useGridSearch(…).sort`                                               |
| `controlSort` / `FluentSortState` / `columnIdSort` | removed — use `sortField`                                             |
| `controlSelection`                                 | `makeGridSelection`                                                   |
| `useFilterValues` prop                             | `getColumnFilter(column).options`, or the data source                 |
| `totalRows` control + `loading` prop               | `search.data.total` / `.loading`                                      |
| `resetPaging` (three places)                       | one `resetPaging` on `useGridSearch`                                  |
| _(none)_                                           | pager, query debounce, `reload()`, `error`, server facets, multi-sort |
