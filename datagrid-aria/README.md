# @astroapps/datagrid-aria

Styles [`@astroapps/datagrid`](../astrolabe-datagrid) with tailwind classes and
uses [react-aria-components](https://react-spectrum.adobe.com/react-aria/) for the
overlays — the filter popover, its checkboxes and radios, the pager buttons.

Sibling to [`@astroapps/datagrid-fluent-ui`](../datagrid-fluent-ui), not a
replacement: same `GridSearch` in, a different look out. The searching — sort,
filter, paging, filter options, client vs server — belongs to
[`@astroapps/datagrid-search`](../datagrid-search), as does row selection and the
rules for which row clicks count and when a pager is worth showing. This package
renders what that gives it and adds no logic of its own.

```bash
npm i @astroapps/datagrid-search @astroapps/datagrid-aria
```

## Two things to set up first

**1. The astrolabe tailwind preset.** The default classes use `primary`,
`secondary` and `surface`, so a project without those colours in its tailwind
theme gets a structurally correct but unstyled grid. Either use the preset, or
retheme with [class overrides](#overriding-the-classes) — every colour this
package sets is overridable.

**2. Tailwind has to scan the package.** Class names live in the shipped JS, and
tailwind only generates CSS for classes it can see:

```ts
// tailwind.config.ts
content: [
  "./src/**/*.{js,ts,jsx,tsx,mdx}",
  "node_modules/@astroapps/datagrid-aria/lib/*.js", // <-- this
],
```

Miss this and the grid renders with the right class names and no CSS behind them.

## A whole grid

```tsx
const state = useControl<SearchRequest>({ ...defaultSearchOptions, length: 25 });
const data = useClientData(state, { rows, columns }); // or useServerData
const search = useGridSearch(state, { columns, data });

<AriaDataGrid search={search} size="md" rowKey={(r) => r.id} />;
```

That's a sortable, filterable, paged grid. Everything it renders follows from the
search rather than a flag:

| Affordance       | Appears when                                                    |
| ---------------- | --------------------------------------------------------------- |
| Sort arrow       | the column has a `sortField`                                    |
| Multi-sort badge | sort `mode` isn't `"single"` and more than one column is sorted |
| Filter funnel    | the column's filter options resolve (see datagrid-search)       |
| Pager            | there's a page before or after this one, or `pageSizes` is set  |
| Selection column | a `selection` is passed                                         |

So a grid whose columns carry none of that renders as a plain table. Grid-wide
off switches exist for the blunt cases: `sortable={false}`, `filterable={false}`,
`pager={false}`.

### Props beyond the search

```tsx
<AriaDataGrid
  search={search}
  size="md" // "md" | "sm" | "xs"
  rowKey={(r) => r.id}
  selection={selection}
  noData="Nothing here"
  pager // false to suppress, or a node to replace
  pageSizes={[10, 25, 50]}
  classes={{ headerCellClass: "uppercase" }}
  icons={{ filter: <MyFunnel /> }}
  renderFilterPopup={(props) => <MyBody {...props} />}
  renderFilterControl={(column, search) => <MyInlineFilter />}
  renderHeaderExtra={(column) => <ColumnInfo column={column} />}
/>
```

`DataGridClasses` props (`className`, `cellClass`, …) also pass through directly
and win over the defaults.

## Overriding the classes

`classes` takes any part of the grid and merges your utilities over the default
with [tailwind-merge](https://github.com/dcastil/tailwind-merge), so a conflicting
utility *replaces* rather than fights:

```tsx
<AriaDataGrid
  search={search}
  classes={{
    headerCellClass: "bg-primary-700 text-white uppercase",
    row: "[&:hover>*]:bg-interactive-50",
    popover: "max-h-[28rem]",
  }}
/>
```

`bg-primary-700` drops the default `bg-white` out of the string entirely. That
matters here because `@astroapps/datagrid` joins its class props with `clsx`, not
Griffel's `mergeClasses` — left to the cascade, two background utilities would be
decided by stylesheet order rather than by which you passed.

`ariaDataGridClasses()` returns the same thing outside a grid, for building cells
or chrome that has to match:

```tsx
const { gridClasses, parts } = ariaDataGridClasses({ size: "sm" });
```

It's not a hook — no context, nothing memoised — so it's safe to call from a
render callback.

Stable `astro-AriaDataGrid__*` names sit on the grid and its cells too, for CSS
escape hatches and for tests that need to find a cell.

## Composing it yourself

When you need to own the `<DataGrid>` call — extra header rows, a custom body
wrapper — use the hook and spread its parts:

```tsx
const bundle = useAriaDataGrid(search, { size, selection, rowKey });

<DataGrid
  {...bundle.gridProps}
  columns={bundle.columns} // selection column already prepended
  bodyRows={search.data.rowProps.bodyRows}
  getBodyRow={search.data.rowProps.getBodyRow}
/>;
```

Same shape as `useFluentDataGrid`, so a composed grid switches renderers by
changing one call. The pieces are exported individually as well —
`ariaDataGridClasses`, `ariaHeaderContent`, `ariaRowWrapper`,
`ariaSelectionColumn`, `AriaFilterPopover`, `FilterOptionList`, `AriaPager`,
`GridCheckbox`.

## Icons

No icon library: the sort arrows, funnel, chevrons, tick, search and spinner are
inline SVGs that inherit `currentColor`. Swap any of them through `icons`, so an
app that already ships FontAwesome doesn't have to accept a second visual
language in its headers:

```tsx
<AriaDataGrid
  search={search}
  icons={{
    filter: <i className="fa-light fa-filter" />,
    sortAscending: <i className="fa-light fa-arrow-up" />,
  }}
/>
```

## Why not build on @astroapps/aria-base?

It already wraps React Aria's `Popover`, `Button`, `Select`, `ListBox` and
`Field`, so the question is a fair one. Three reasons:

1. **It has no `Checkbox`** — the primitive this package most needs, and it needs
   one that can be indeterminate, for the "some of this page is selected" header
   state.
2. **Its colours don't resolve under the astrolabe preset.** `Popover` uses
   `text-neutral-700` and `ListBox` uses `border-neutral-300`; the preset
   *replaces* `theme.colors` and has no `neutral` scale, so those are silently
   dropped today. Building on it would inherit that. (Worth fixing there — it's a
   real bug, just not this package's to fix.)
3. **It's published with other consumers** (`aria-datepicker`, `schemas-*`), so
   reshaping its popover to suit a grid has a wider blast radius than owning ~80
   lines of popover markup here.

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

Selected rows are painted, and clicking anywhere on a row toggles it —
`selectOnRowClick={false}` leaves that to the checkbox. Clicks on interactive cell
content (a link, a button, the checkbox) and the click that ends a text drag don't
count; see `shouldIgnoreRowClick` in datagrid-search.

`makeGridSelection` is re-exported from datagrid-search for convenience, along
with `arraySelection` for plain state. Neither is a hook, despite taking a
control — they read `.value` when called, so call them during render.

## Adding to a header

`renderHeaderExtra` renders after the filter funnel, for anything a column wants
in its header that sorting and filtering don't cover:

```tsx
renderHeaderExtra={(column) =>
  column.id === "margin" ? (
    <InfoTip className="shrink-0" text="Gross margin, ex-GST" />
  ) : undefined
}
```

It is a sibling of the sort button, not a child, so it can hold interactive
content — nesting a button inside the sort button would be invalid HTML. The sort
button is `w-full`, so give the extra `shrink-0` to keep a long title from
squeezing it out.

To wrap the *whole* cell instead — a tooltip covering the title, arrow and funnel
together — use the column's own `renderHeader` from `@astroapps/datagrid`, going
through `defaultRenderCell` so the cell keeps its grid placement.

## Custom filter popups

Three levels, most specific first:

1. `getColumnFilter(column).render` — replaces one column's popup **body**,
   keeping the standard funnel and the loading/error/empty shell.
2. `renderFilterPopup` on the grid — the same, as the default for every column.
3. `renderFilterControl` on the grid — replaces the funnel **and** popup, for a
   column that wants an inline control instead.

The body receives `FilterPopupProps`, whose whole contract is a
`Control<string[] | undefined>` for that column. `FilterOptionList` is exported so
a custom body can keep the standard list and just add a header.

The body is a separate component, and React Aria's `Popover` renders nothing while
closed — so an async option source is lazy for free: no request until the funnel
is clicked, and none at all for a column nobody filters.

Two small departures from the Fluent renderer, both deliberate:

- **The search box is a `TextField`, not a `SearchField`.** React Aria's
  `SearchField` takes Escape for itself to clear the text, and in a popup Escape
  is how you close. It also ships a clear button that appears with the first
  keystroke, which would resize a shrink-to-fit popup as you type; the text is
  discarded when the popup unmounts anyway.
- **The page-size control is a native `<select>`.** React Aria's needs a popover
  and a listbox to pick a number out of five, and the native element is already
  keyboard- and screen-reader-correct.

## Pager

Prev/next over `offset`/`length` with an optional page-size selector, hidden when
everything fits on one page — unless `pageSizes` is set, since that selector is
the only way back from a size that fits every row. Then it stays, with prev/next
disabled.

It copes with a source that doesn't count: without a total it shows `1-10` instead
of `1-10 of 42`, and enables Next while the page comes back full. See `pageInfo`
and `pagerVisible` in datagrid-search.

## Testing

Tests run through babel rather than ts-jest, so the
`@react-typed-forms/transform` control-tracking plugin applies — which is what
makes components that call `useControl` (the filter popup body, chiefly)
renderable at all in a test. `npm test` type-checks first, since babel strips
types without checking them. See `babel.jest.cjs` for the details, and
`jest.setup.js` for the jsdom shims React Aria's overlays need.

## Demo

`sites/formServer/src/app/ariagrid` renders this grid and the Fluent one over the
*same* `GridSearch`, so anything that differs between the two is the renderer's
doing.
