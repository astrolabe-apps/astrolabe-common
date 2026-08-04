"use client";

/**
 * Side-by-side harness proving `@astroapps/datagrid-fluent-ui` styles
 * `@astroapps/datagrid` to look *exactly* like the FluentUI v9 `DataGrid`.
 *
 * Left  = the real Fluent v9 DataGrid.
 * Right = `@astroapps/datagrid` + `@astroapps/datagrid-fluent-ui`, driven by the
 *         same sort/selection state, so interacting with either moves both.
 *
 * The "Computed style diff" panel reads `getComputedStyle` off the live cells of
 * both grids, so mismatches are found by measurement rather than by eyeball. It
 * targets the library's own stable class names, which means it keeps working as
 * a regression check on the library itself.
 */

import React, { ReactNode, useEffect, useRef } from "react";
import clsx from "clsx";
import {
  Avatar,
  Button,
  DataGrid as FluentDataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  FluentProvider,
  makeStyles,
  Switch,
  TableCellLayout,
  SearchBox,
  TableColumnDefinition,
  TableColumnSizingOptions,
  createTableColumn,
  tokens,
  typographyStyles,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";
import {
  ColumnDefInit,
  DataGrid,
  columnDefinitions,
} from "@astroapps/datagrid";
import {
  FluentDataGridSize,
  FluentDataTable,
  FluentSortState,
  controlSearchStateSort,
  controlSelection,
  controlSort,
  fluentDataGridClassNames,
  useFluentDataGrid,
} from "@astroapps/datagrid-fluent-ui";
import { SearchOptions, defaultSearchOptions } from "@astroapps/searchstate";
import { useControl } from "@react-typed-forms/core";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface FileRow {
  id: string;
  file: string;
  author: string;
  lastUpdated: string;
  updatedAt: number;
  category: string;
}

const rows: FileRow[] = [
  {
    id: "1",
    file: "Meeting notes",
    author: "Max Mustermann",
    lastUpdated: "7h ago",
    updatedAt: 7,
    category: "Document",
  },
  {
    id: "2",
    file: "Thursday presentation",
    author: "Erika Mustermann",
    lastUpdated: "Yesterday at 1:45 PM",
    updatedAt: 30,
    category: "Presentation",
  },
  {
    id: "3",
    file: "Training recording",
    author: "John Doe",
    lastUpdated: "Yesterday at 1:45 PM",
    updatedAt: 31,
    category: "Video",
  },
  {
    id: "4",
    file: "Purchase order",
    author: "Jane Doe",
    lastUpdated: "Tue at 9:30 AM",
    updatedAt: 96,
    category: "Spreadsheet",
  },
  {
    id: "5",
    file: "Q3 roadmap with a deliberately long name to test truncation",
    author: "Alexandra Mustermann",
    lastUpdated: "Mon at 4:12 PM",
    updatedAt: 120,
    category: "Document",
  },
];

/**
 * Shared column metadata — both grids are built from this single source.
 *
 * Keep the total (plus 44px for the selection column) comfortably under the
 * pane width: when the container is narrower than the sum, Fluent's column
 * sizing redistributes/shrinks columns while a CSS grid template does not.
 */
const COLUMNS = [
  { id: "file", title: "File", width: 220, minWidth: 120 },
  { id: "author", title: "Author", width: 180, minWidth: 120 },
  { id: "lastUpdated", title: "Last updated", width: 150, minWidth: 120 },
  { id: "category", title: "Category", width: 120, minWidth: 100 },
] as const;

const compares: Record<string, (a: FileRow, b: FileRow) => number> = {
  file: (a, b) => a.file.localeCompare(b.file),
  author: (a, b) => a.author.localeCompare(b.author),
  lastUpdated: (a, b) => a.updatedAt - b.updatedAt,
  category: (a, b) => a.category.localeCompare(b.category),
};

/** Cell content — deliberately identical between the two grids. */
function cellContent(row: FileRow, columnId: string): ReactNode {
  switch (columnId) {
    case "file":
      return <TableCellLayout truncate>{row.file}</TableCellLayout>;
    case "author":
      return (
        <TableCellLayout
          truncate
          media={<Avatar name={row.author} color="colorful" size={24} />}
        >
          {row.author}
        </TableCellLayout>
      );
    case "lastUpdated":
      return <TableCellLayout truncate>{row.lastUpdated}</TableCellLayout>;
    default:
      return <TableCellLayout truncate>{row.category}</TableCellLayout>;
  }
}

type SortModel = "searchstate" | "columnId";

/**
 * Columns for the `FluentDataTable` pane. `getter` + `sortField` + `filterField`
 * is all `columnSearching` needs to drive searchstate's client-side query,
 * filter and sort — `columnDefinitions` derives `compare`/`filterValue` from the
 * getters.
 */
const TABLE_COLUMNS = columnDefinitions<FileRow>(
  {
    id: "file",
    title: "File",
    sortField: "file",
    getter: (r) => r.file,
    render: (r) => cellContent(r, "file"),
  },
  {
    id: "author",
    title: "Author",
    sortField: "author",
    filterField: "author",
    getter: (r) => r.author,
    render: (r) => cellContent(r, "author"),
  },
  {
    id: "lastUpdated",
    title: "Last updated",
    sortField: "lastUpdated",
    getter: (r) => r.updatedAt,
    render: (r) => cellContent(r, "lastUpdated"),
  },
  {
    id: "category",
    title: "Category",
    sortField: "category",
    filterField: "category",
    getter: (r) => r.category,
    render: (r) => cellContent(r, "category"),
  },
);

// ---------------------------------------------------------------------------
// Page chrome (the grids themselves are styled entirely by the library)
// ---------------------------------------------------------------------------

const usePageStyles = makeStyles({
  page: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    backgroundColor: tokens.colorNeutralBackground2,
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  knobs: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "16px",
    padding: "12px 16px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  panes: { display: "grid", gap: "24px", alignItems: "start" },
  sideBySide: { gridTemplateColumns: "1fr 1fr" },
  stacked: { gridTemplateColumns: "1fr" },
  pane: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
  paneBody: {
    padding: "8px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    overflowX: "auto",
  },
  diff: {
    padding: "16px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    overflowX: "auto",
  },
  diffTable: {
    borderCollapse: "collapse",
    ...typographyStyles.caption1,
    fontFamily: tokens.fontFamilyMonospace,
    "& th, & td": {
      textAlign: "left",
      padding: "2px 12px 2px 0",
      whiteSpace: "nowrap",
    },
    "& th": { ...typographyStyles.caption1Strong },
  },
  ok: { color: tokens.colorPaletteGreenForeground1 },
  bad: { color: tokens.colorPaletteRedForeground1, fontWeight: 600 },
  expected: { color: tokens.colorPaletteYellowForeground1 },
  group: { ...typographyStyles.caption1Strong, paddingTop: "8px" },
  state: {
    ...typographyStyles.caption1,
    fontFamily: tokens.fontFamilyMonospace,
  },
});

// ---------------------------------------------------------------------------
// Computed-style diffing
// ---------------------------------------------------------------------------

const BOX_PROPS = [
  "height",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "color",
  "backgroundColor",
  "columnGap",
  "textAlign",
];

const BORDER_PROPS = [
  "borderBottomWidth",
  "borderBottomStyle",
  "borderBottomColor",
  "backgroundColor",
  // renderedHeight (border box) is the meaningful one here: a Fluent row is
  // cellHeight + divider, and the astrolabe cell must total the same.
  "renderedHeight",
];

const ICON_PROPS = ["width", "height", "fontSize", "color"];

interface Comparison {
  label: string;
  fluent: string;
  astro: string;
  props: string[];
  skipWidth?: boolean;
  /**
   * Props whose difference is structural rather than a styling gap, so they
   * render as "≈" instead of a failure. Backgrounds are the interesting case:
   * Fluent paints hover/selection on the row, astrolabe has no row box and must
   * paint every cell — so the *row divider* group is the authoritative
   * background check and the per-cell rows here are noise.
   */
  expected?: string[];
}

const n = fluentDataGridClassNames;

/**
 * `fui-*` class names are stable public API in Fluent v9, and the astrolabe side
 * uses the library's exported class names — so neither side of this comparison
 * can silently drift.
 *
 * The astrolabe selectors exclude the selection column, because Fluent's
 * `.fui-TableHeaderCell`/`.fui-TableCell` exclude it too (it's a
 * `.fui-TableSelectionCell`) — otherwise we'd be comparing different columns.
 */
const COMPARISONS: Comparison[] = [
  {
    label: "Header cell",
    fluent: ".fui-TableHeaderCell",
    astro: `.${n.headerCell}:not(.${n.selectionHeaderCell})`,
    props: BOX_PROPS,
  },
  {
    label: "Header button",
    fluent: ".fui-TableHeaderCell__button",
    astro: `.${n.sortButton}`,
    props: BOX_PROPS,
  },
  {
    label: "Sort icon",
    fluent: ".fui-TableHeaderCell__sortIcon",
    astro: `.${n.sortIcon}`,
    props: ICON_PROPS,
  },
  {
    label: "Body cell",
    fluent: ".fui-TableCell",
    astro: `.${n.bodyCell}:not(.${n.selectionCell})`,
    props: BOX_PROPS,
    // height: at extra-small Fluent's cell is 24px inside a 32px row.
    expected: ["backgroundColor", "height"],
  },
  {
    label: "Header divider — fluent row vs astrolabe cell",
    fluent: ".fui-TableHeader .fui-TableRow",
    astro: `.${n.headerCell}:not(.${n.selectionHeaderCell})`,
    props: BORDER_PROPS,
    skipWidth: true,
  },
  {
    // Fluent draws the divider on the row; astrolabe has no row box
    // (display: contents), so it must draw the same border on every cell.
    label: "Row divider — fluent row vs astrolabe cell",
    fluent: ".fui-TableBody .fui-TableRow",
    astro: `.${n.bodyCell}:not(.${n.selectionCell})`,
    props: BORDER_PROPS,
    // A row spans the whole table, a cell doesn't — widths aren't comparable.
    skipWidth: true,
  },
  {
    label: "Selection cell (header)",
    fluent: ".fui-TableHeader .fui-TableSelectionCell",
    astro: `.${n.selectionHeaderCell}`,
    props: BOX_PROPS,
  },
  {
    label: "Selection cell (body)",
    fluent: ".fui-TableBody .fui-TableSelectionCell",
    astro: `.${n.selectionCell}`,
    props: BOX_PROPS,
    // Fluent's selection cell is only as tall as its checkbox because the row
    // paints the background; astrolabe's has to fill the row.
    expected: ["backgroundColor", "height"],
  },
];

interface DiffGroup {
  label: string;
  missing?: string;
  props: {
    name: string;
    fluent: string;
    astro: string;
    expected?: boolean;
  }[];
}

function measure(root: HTMLElement | null, selector: string, props: string[]) {
  const el = root?.querySelector<HTMLElement>(selector);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const out: Record<string, string> = {};
  const box = el.getBoundingClientRect();
  props.forEach((p) => (out[p] = (cs as any)[p]));
  out.renderedWidth = box.width.toFixed(1) + "px";
  out.renderedHeight = box.height.toFixed(1) + "px";
  return out;
}

function widths(root: HTMLElement | null, selector: string) {
  return Array.from(root?.querySelectorAll<HTMLElement>(selector) ?? []).map(
    (e) => e.getBoundingClientRect().width,
  );
}

function columnWidths(root: HTMLElement | null, selector: string) {
  return widths(root, selector)
    .map((w) => w.toFixed(1))
    .join(" | ");
}

/**
 * How much of the grid's own width the cells don't cover. Fluent's resizable
 * column sizing reserves a constant ~48px here, which is why its last column
 * ends up narrower than a plain CSS-grid template's would.
 */
function unusedWidth(
  root: HTMLElement | null,
  gridSelector: string,
  cellSelector: string,
) {
  const total = widths(root, gridSelector)[0];
  if (total === undefined) return "";
  const used = widths(root, cellSelector).reduce((a, b) => a + b, 0);
  return (total - used).toFixed(1) + "px";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FluentGridComparison() {
  const dark = useControl(false);
  const size = useControl<FluentDataGridSize>("medium");
  const stacked = useControl(false);
  const multiselect = useControl(true);
  const sortable = useControl(true);
  const fixedWidths = useControl(true);
  const sortModel = useControl<SortModel>("searchstate");
  const cycleUnsorted = useControl(false);
  // Two ways of holding sort state, to exercise both library adapters:
  // @astroapps/searchstate's "a"/"d"-prefixed sort fields...
  const searchState = useControl<SearchOptions>({
    ...defaultSearchOptions,
    sort: ["afile"],
  });
  // ...and a plain single-column {columnId, direction}.
  const columnSortState = useControl<FluentSortState>({
    columnId: "file",
    direction: "ascending",
  });
  const selectedIds = useControl<string[]>([]);
  const diff = useControl<DiffGroup[]>([]);
  // State for the FluentDataTable pane below.
  const viewState = useControl<SearchOptions>({
    ...defaultSearchOptions,
    sort: ["afile"],
  });
  const viewTotal = useControl(0);
  const viewLoading = useControl(false);
  const viewEmpty = useControl(false);

  const page = usePageStyles();
  const fluentRef = useRef<HTMLDivElement>(null);
  const astroRef = useRef<HTMLDivElement>(null);

  const isDark = dark.value;
  const gridSize = size.value;
  const selectionMode = multiselect.value ? "multiselect" : undefined;
  const isSortable = sortable.value;
  const useFixedWidths = fixedWidths.value;
  const model = sortModel.value;

  // --- Library wiring ----------------------------------------------------
  const sort =
    model === "searchstate"
      ? controlSearchStateSort(searchState, {
          cycleUnsorted: cycleUnsorted.value,
        })
      : controlSort(columnSortState);

  const selection = selectionMode
    ? controlSelection<FileRow>({
        selected: selectedIds,
        rows,
        getId: (r) => r.id,
      })
    : undefined;

  const dataColumns = columnDefinitions<FileRow>(
    ...COLUMNS.map((c, i): ColumnDefInit<FileRow> => ({
      id: c.id,
      title: c.title,
      // `sortField` is what marks a column sortable, for both adapters.
      sortField: c.id,
      compare: compares[c.id],
      // Fluent's sized columns fill the container and give all the slack to
      // the last column, so the last one has to grow here too.
      columnTemplate:
        useFixedWidths && i < COLUMNS.length - 1
          ? `${c.width}px`
          : `minmax(${useFixedWidths ? c.width : c.minWidth}px, 1fr)`,
      render: (row) => cellContent(row, c.id),
    })),
  );

  const astroRows = sort.sortRows(rows, dataColumns);

  const fluent = useFluentDataGrid<FileRow>({
    size: gridSize,
    rows: astroRows,
    rowKey: (r) => r.id,
    sort,
    selection,
    header: isSortable ? undefined : { isSortable: () => false },
  });

  const astroColumns = fluent.selectionColumn
    ? [...columnDefinitions<FileRow>(fluent.selectionColumn), ...dataColumns]
    : dataColumns;

  // --- Fluent side, driven from the same FluentSort ------------------------
  const sortedColumn = dataColumns.find((c) => sort.direction(c));
  const sortDirection = sortedColumn && sort.direction(sortedColumn);

  const fluentColumns: TableColumnDefinition<FileRow>[] = COLUMNS.map((c) =>
    createTableColumn<FileRow>({
      columnId: c.id,
      compare: compares[c.id],
      renderHeaderCell: () => c.title,
      renderCell: (item) => cellContent(item, c.id),
    }),
  );

  const columnSizingOptions: TableColumnSizingOptions = Object.fromEntries(
    COLUMNS.map((c) => [
      c.id,
      { minWidth: c.minWidth, defaultWidth: c.width, idealWidth: c.width },
    ]),
  );

  // --- Measurement -------------------------------------------------------
  function runMeasure() {
    const groups: DiffGroup[] = COMPARISONS.map(
      ({ label, fluent: fSel, astro: aSel, props, skipWidth, expected }) => {
        const f = measure(fluentRef.current, fSel, props);
        const a = measure(astroRef.current, aSel, props);
        if (!f || !a)
          return {
            label,
            missing: !f
              ? `no element matched ${fSel}`
              : `no element matched ${aSel}`,
            props: [],
          };
        // A zero-width border's style/colour is noise — both paint nothing.
        const noBorder =
          f.borderBottomWidth === "0px" && a.borderBottomWidth === "0px";
        const names = [
          ...props,
          ...(skipWidth ? [] : ["renderedWidth"]),
        ].filter(
          (x) =>
            !noBorder ||
            (x !== "borderBottomStyle" && x !== "borderBottomColor"),
        );
        return {
          label,
          props: names.map((name) => ({
            name,
            fluent: f[name],
            astro: a[name],
            expected: expected?.includes(name),
          })),
        };
      },
    );
    groups.push({
      label: "Column widths",
      props: [
        {
          name: "data columns",
          fluent: columnWidths(fluentRef.current, ".fui-TableHeaderCell"),
          astro: columnWidths(
            astroRef.current,
            `.${n.headerCell}:not(.${n.selectionHeaderCell})`,
          ),
        },
        {
          name: "grid total",
          fluent: columnWidths(fluentRef.current, ".fui-DataGrid"),
          astro: columnWidths(astroRef.current, `.${n.grid}`),
        },
        {
          name: "unused width",
          fluent: unusedWidth(
            fluentRef.current,
            ".fui-DataGrid",
            ".fui-TableHeader .fui-TableHeaderCell, .fui-TableHeader .fui-TableSelectionCell",
          ),
          astro: unusedWidth(
            astroRef.current,
            `.${n.grid}`,
            `.${n.headerCell}`,
          ),
        },
      ],
    });
    diff.value = groups;
  }

  // Deep-linkable knobs, e.g. /fluentgrid?size=small&dark=1&sortmodel=columnId
  // — lets the whole matrix be screenshotted/diffed headlessly.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const bool = (k: string) => (p.has(k) ? p.get(k) !== "0" : undefined);
    const s = p.get("size") as FluentDataGridSize | null;
    if (s) size.value = s;
    const sm = p.get("sortmodel") as SortModel | null;
    if (sm) sortModel.value = sm;
    const d = bool("dark");
    if (d !== undefined) dark.value = d;
    const sel = bool("select");
    if (sel !== undefined) multiselect.value = sel;
    const so = bool("sort");
    if (so !== undefined) sortable.value = so;
    const fw = bool("fixed");
    if (fw !== undefined) fixedWidths.value = fw;
    const st = bool("stacked");
    if (st !== undefined) stacked.value = st;
    const pre = p.get("selected");
    if (pre) selectedIds.value = pre.split(",");
    // e.g. ?sortfields=dfile for descending by the "file" sortField.
    // "none" reaches the unsorted third state of searchstate's rotate cycle.
    const sf = p.get("sortfields");
    if (sf) searchState.fields.sort.value = sf === "none" ? [] : sf.split(",");
    // Drive the FluentDataTable pane headlessly, e.g.
    // ?viewsort=dfile&viewquery=mustermann&viewfilter=category:Document
    const vs = p.get("viewsort");
    if (vs) viewState.fields.sort.value = vs.split(",");
    const vq = p.get("viewquery");
    if (vq) viewState.fields.query.value = vq;
    const vf = p.get("viewfilter");
    if (vf) {
      const [field, ...values] = vf.split(":");
      viewState.fields.filters.value = { [field]: values[0].split("|") };
    }
    const cu = bool("cycleunsorted");
    if (cu !== undefined) cycleUnsorted.value = cu;
    if (bool("viewloading")) viewLoading.value = true;
    if (bool("viewempty")) viewEmpty.value = true;
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => runMeasure());
    return () => cancelAnimationFrame(id);
  }, [
    isDark,
    gridSize,
    selectionMode,
    isSortable,
    useFixedWidths,
    model,
    sortedColumn?.id,
    sortDirection,
    selectedIds.value.length,
  ]);

  return (
    <FluentProvider theme={isDark ? webDarkTheme : webLightTheme}>
      <div className={page.page}>
        <div>
          <h1 style={typographyStyles.title3 as any}>
            Fluent v9 DataGrid vs @astroapps/datagrid-fluent-ui
          </h1>
          <p style={typographyStyles.body1 as any}>
            Same data and the same sort/selection state, so sorting or selecting
            on either side drives both. The astrolabe grid is styled entirely by{" "}
            <code>useFluentDataGrid</code> — this page contributes no grid CSS.
          </p>
        </div>

        <div className={page.knobs}>
          <Switch
            label="Dark theme"
            checked={isDark}
            onChange={(_, d) => (dark.value = d.checked)}
          />
          <Switch
            label="Multiselect"
            checked={multiselect.value}
            onChange={(_, d) => (multiselect.value = d.checked)}
          />
          <Switch
            label="Sortable"
            checked={isSortable}
            onChange={(_, d) => (sortable.value = d.checked)}
          />
          <Switch
            label="Fixed column widths"
            checked={useFixedWidths}
            onChange={(_, d) => (fixedWidths.value = d.checked)}
          />
          <Switch
            label="Stacked layout"
            checked={stacked.value}
            onChange={(_, d) => (stacked.value = d.checked)}
          />
          <Switch
            label="Cycle unsorted"
            checked={cycleUnsorted.value}
            onChange={(_, d) => (cycleUnsorted.value = d.checked)}
          />
          {(["medium", "small", "extra-small"] as FluentDataGridSize[]).map(
            (s) => (
              <Button
                key={s}
                size="small"
                appearance={gridSize === s ? "primary" : "secondary"}
                onClick={() => (size.value = s)}
              >
                {s}
              </Button>
            ),
          )}
          {(["searchstate", "columnId"] as SortModel[]).map((m) => (
            <Button
              key={m}
              size="small"
              appearance={model === m ? "primary" : "secondary"}
              onClick={() => (sortModel.value = m)}
            >
              sort: {m}
            </Button>
          ))}
          <Button size="small" onClick={runMeasure}>
            Re-measure
          </Button>
        </div>

        <div className={page.state}>
          {model === "searchstate" ? (
            <>
              searchstate: sort={JSON.stringify(searchState.fields.sort.value)}{" "}
              offset={searchState.fields.offset.value} — header clicks cycle{" "}
              {cycleUnsorted.value
                ? "asc → desc → unsorted (rotateSort's own cycle)"
                : "asc ↔ desc (like Fluent's)"}
              , and reset offset
            </>
          ) : (
            <>columnId: {JSON.stringify(columnSortState.value)}</>
          )}
        </div>

        <div
          className={clsx(
            page.panes,
            stacked.value ? page.stacked : page.sideBySide,
          )}
        >
          <div className={page.pane}>
            <div style={typographyStyles.subtitle2 as any}>
              Fluent v9 DataGrid
            </div>
            <div className={page.paneBody} ref={fluentRef}>
              <FluentDataGrid
                items={rows}
                columns={fluentColumns}
                getRowId={(r) => r.id}
                size={gridSize}
                sortable={isSortable}
                // Fluent's useTableSort is controlled as soon as `sortState` is
                // set, and passing undefined later flips it back to uncontrolled
                // with no `defaultSortState` to fall back on — it then throws
                // destructuring undefined. searchstate's rotate cycle has an
                // unsorted third state, so stay controlled and report an
                // undefined sortColumn instead of dropping the prop.
                sortState={{
                  sortColumn: sortedColumn?.id,
                  sortDirection: sortDirection ?? "ascending",
                }}
                onSortChange={(_, next) => {
                  const col = dataColumns.find((c) => c.id === next.sortColumn);
                  // Toggling through the shared FluentSort keeps one source of
                  // truth, so both grids agree even where Fluent's own cycle
                  // differs (searchstate's has an extra "unsorted" step).
                  if (col) sort.toggle(col);
                }}
                selectionMode={selectionMode}
                selectedItems={selectedIds.value}
                onSelectionChange={(_, data) =>
                  (selectedIds.value = [...data.selectedItems].map(String))
                }
                resizableColumns={useFixedWidths}
                columnSizingOptions={columnSizingOptions}
                focusMode="composite"
              >
                <DataGridHeader>
                  <DataGridRow
                    selectionCell={{ "aria-label": "Select all rows" }}
                  >
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>
                        {renderHeaderCell()}
                      </DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<FileRow>>
                  {({ item, rowId }) => (
                    <DataGridRow<FileRow>
                      key={rowId}
                      selectionCell={{ "aria-label": "Select row" }}
                    >
                      {({ renderCell }) => (
                        <DataGridCell>{renderCell(item)}</DataGridCell>
                      )}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </FluentDataGrid>
            </div>
          </div>

          <div className={page.pane}>
            <div style={typographyStyles.subtitle2 as any}>
              @astroapps/datagrid + datagrid-fluent-ui
            </div>
            <div className={page.paneBody} ref={astroRef}>
              <DataGrid<FileRow>
                {...fluent.gridProps}
                rows={astroRows}
                columns={astroColumns}
              />
            </div>
          </div>
        </div>

        <div className={page.pane}>
          <div style={typographyStyles.subtitle2 as any}>
            FluentDataTableView — searchstate-driven, via FluentDataTable
          </div>
          <p style={typographyStyles.caption1 as any}>
            Sorting, free-text query and per-column filters all come from{" "}
            <code>@astroapps/searchstate</code>; the only glue is{" "}
            <code>columnSearching</code>, which turns the columns into the
            accessors it wants. Author and Category have a{" "}
            <code>filterField</code>, so they get a filter popover.
          </p>
          <div className={page.knobs}>
            <SearchBox
              placeholder="Query"
              value={viewState.fields.query.value ?? ""}
              onChange={(_, d) => (viewState.fields.query.value = d.value)}
            />
            <Switch
              label="Loading"
              checked={viewLoading.value}
              onChange={(_, d) => (viewLoading.value = d.checked)}
            />
            <Switch
              label="No data"
              checked={viewEmpty.value}
              onChange={(_, d) => (viewEmpty.value = d.checked)}
            />
            <span className={page.state} data-testid="view-state">
              sort={JSON.stringify(viewState.fields.sort.value)} filters=
              {JSON.stringify(viewState.fields.filters.value)} rows=
              {viewTotal.value}
            </span>
          </div>
          <div className={page.paneBody}>
            <FluentDataTable<FileRow>
              state={viewState}
              data={viewEmpty.value ? [] : rows}
              columns={TABLE_COLUMNS}
              size={gridSize}
              loading={viewLoading.value}
              totalRows={viewTotal}
              rowId={(r) => r.id}
            />
          </div>
        </div>

        <div className={page.diff}>
          <div style={typographyStyles.subtitle2 as any}>
            Computed style diff
          </div>
          <p style={typographyStyles.caption1 as any}>
            <b>✗</b> is a real styling gap. <b>≈</b> is a structural difference
            with no pixel impact: Fluent has a row box and paints the
            divider/hover/selection on it, while astrolabe has no row box (the
            row wrapper is <code>display: contents</code>) and must paint every
            cell instead — so the &quot;Row divider&quot; group, which compares
            Fluent&apos;s row against an astrolabe cell, is the authoritative
            background/border check.
          </p>
          <p style={typographyStyles.caption1 as any}>
            <b>Column widths</b> are the one genuine behavioural difference:
            Fluent&apos;s resizable column sizing reserves a constant ~48px of
            the container (see &quot;unused width&quot;) and gives the remaining
            slack to the last column, so a plain CSS-grid template can&apos;t
            land on the same numbers. Match it by setting the widths you want
            explicitly rather than letting either side distribute slack.
          </p>
          <table className={page.diffTable}>
            <thead>
              <tr>
                <th>property</th>
                <th>fluent</th>
                <th>astrolabe</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {diff.value.map((g) => (
                <React.Fragment key={g.label}>
                  <tr>
                    <td className={page.group} colSpan={4}>
                      {g.label}
                      {g.missing ? ` — ${g.missing}` : ""}
                    </td>
                  </tr>
                  {g.props.map((p) => {
                    const match = p.fluent === p.astro;
                    const cls = match
                      ? page.ok
                      : p.expected
                        ? page.expected
                        : page.bad;
                    return (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td>{p.fluent}</td>
                        <td className={match ? undefined : cls}>{p.astro}</td>
                        <td className={cls}>
                          {match ? "✓" : p.expected ? "≈" : "✗"}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FluentProvider>
  );
}
