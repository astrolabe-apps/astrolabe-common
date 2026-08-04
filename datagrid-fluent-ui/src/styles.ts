import {
  makeStyles,
  tokens,
  typographyStyles,
} from "@fluentui/react-components";
import type { DataGridClasses } from "@astroapps/datagrid";
import clsx from "clsx";

export type FluentDataGridSize = "extra-small" | "small" | "medium";

/**
 * Stable class names put on the grid and its cells, mirroring Fluent's own
 * `fui-*` convention. Useful for CSS overrides and for tests/harnesses that
 * need to measure the rendered cells.
 */
export const fluentDataGridClassNames = {
  grid: "astro-FluentDataGrid",
  headerCell: "astro-FluentDataGrid__headerCell",
  bodyCell: "astro-FluentDataGrid__bodyCell",
  selectionHeaderCell: "astro-FluentDataGrid__selectionHeaderCell",
  selectionCell: "astro-FluentDataGrid__selectionCell",
  row: "astro-FluentDataGrid__row",
  sortButton: "astro-FluentDataGrid__sortButton",
  sortIcon: "astro-FluentDataGrid__sortIcon",
  sortPriority: "astro-FluentDataGrid__sortPriority",
  filterButton: "astro-FluentDataGrid__filterButton",
} as const;

/**
 * Classes for the parts that aren't plain grid cells. Passed to the helper
 * renderers (`fluentSelectionColumn`, `fluentHeaderContent`,
 * `fluentRowWrapper`) so they don't each need their own `makeStyles` call.
 */
export interface FluentDataGridParts {
  selectionCell: string;
  row: string;
  rowSelected: string;
  sortButton: string;
  sortButtonLabel: string;
  sortIcon: string;
  /** The "sorted 2nd" badge, shown only in multi-sort. */
  sortPriority: string;
  filterButton: string;
  filterButtonActive: string;
}

export interface FluentDataGridStyleOptions {
  /** Matches Fluent's `DataGrid` `size` prop. Defaults to "medium". */
  size?: FluentDataGridSize;
  /** Track sizing for columns without an explicit `columnTemplate`. */
  defaultColumnTemplate?: string;
}

/**
 * Every declaration order in here matters, for two reasons:
 *
 * 1. `@astroapps/datagrid` joins the class props with clsx rather than Griffel's
 *    `mergeClasses`, so Griffel's atomic-override resolution doesn't apply —
 *    when two class sets set the same property the winner is whichever rule
 *    Griffel inserted later, i.e. whichever is declared later here.
 * 2. `selectionCell` and the `*Size` classes therefore come after `cell`, so
 *    their padding/height/border/font-size override the base cell.
 *
 * The metrics were measured off a live Fluent v9 DataGrid rather than guessed:
 * body rows are 44/34/32px of content, the header row is 32px at *every* size,
 * and `extra-small` drops the row divider and uses 12px text.
 */
const useStyles = makeStyles({
  grid: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    width: "100%",
  },
  cell: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    overflow: "hidden",
    // Fluent's divider lives on the row, below the cell, so a row totals
    // cellHeight + 1px. content-box makes the heights below mean "content
    // height" too — otherwise every row is 1px short and the grid drifts out of
    // alignment by 1px per row.
    boxSizing: "content-box",
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderBottomWidth: tokens.strokeWidthThin,
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  headerCell: {
    // Fluent v9 table headers are NOT bold, unlike astrolabe's default
    // `defaultTableClasses.headerCellClass` of "font-bold".
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground1,
  },
  bodyCell: {
    color: tokens.colorNeutralForeground1,
  },
  selectionCell: {
    paddingLeft: 0,
    paddingRight: 0,
    justifyContent: "center",
    textAlign: "center",
  },
  headerMedium: { height: "32px" },
  headerSmall: { height: "32px" },
  headerExtraSmall: {
    height: "32px",
    fontSize: tokens.fontSizeBase200,
    borderBottomWidth: "0",
  },
  bodyMedium: { height: "44px" },
  bodySmall: { height: "34px" },
  bodyExtraSmall: {
    // Fluent keeps a 32px row here even though its cells measure 24px; an
    // astrolabe cell *is* the row, so it takes the full 32px.
    height: "32px",
    fontSize: tokens.fontSizeBase200,
    borderBottomWidth: "0",
  },
  // The row wrapper is `display: contents` so cells stay direct grid items and
  // keep their explicit grid placement. It paints no box of its own, but
  // :hover still resolves up the DOM ancestor chain, so the children can be
  // targeted to paint the whole row.
  row: {
    ":hover": {
      "& > *": { backgroundColor: tokens.colorSubtleBackgroundHover },
    },
    ":active": {
      "& > *": { backgroundColor: tokens.colorSubtleBackgroundPressed },
    },
  },
  // Fluent's DataGrid defaults to `selectionAppearance: "brand"`, so a selected
  // row is brand-tinted and hides its divider.
  rowSelected: {
    "& > *": {
      backgroundColor: tokens.colorBrandBackground2,
      borderBottomColor: "transparent",
    },
    ":hover": {
      "& > *": { backgroundColor: tokens.colorBrandBackground2Hover },
    },
    ":active": {
      "& > *": { backgroundColor: tokens.colorBrandBackground2Pressed },
    },
  },
  sortButton: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    width: "100%",
    height: "100%",
    minWidth: 0,
    padding: 0,
    margin: 0,
    border: "none",
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: "transparent",
    color: "inherit",
    // Deliberately not `font: inherit`, which would inherit line-height too:
    // Fluent's header button computes to `line-height: normal`.
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    lineHeight: "normal",
    textAlign: "left",
    cursor: "pointer",
    ":focus-visible": {
      outlineWidth: tokens.strokeWidthThick,
      outlineStyle: "solid",
      outlineColor: tokens.colorStrokeFocus2,
    },
  },
  sortButtonLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sortIcon: {
    display: "flex",
    alignItems: "center",
    // Fluent's sort icon slot measures 12x14 and inherits the cell's font size
    // (14px, or 12px at extra-small); the glyph itself is always 12px.
    fontSize: "inherit",
    height: "14px",
    width: "12px",
    "& svg": { width: "12px", height: "12px" },
  },
  // Fluent's own DataGrid is single-sort and so has no equivalent; this follows
  // its caption sizing rather than inventing a look.
  sortPriority: {
    ...typographyStyles.caption2,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  filterButton: {
    // Sits outside the sort button, since nesting interactive elements is
    // invalid. Sized to the 20px icon slot so it doesn't grow the 32px header.
    minWidth: "20px",
    maxWidth: "20px",
    height: "20px",
    padding: 0,
    flexShrink: 0,
  },
  filterButtonActive: { color: tokens.colorBrandForeground1 },
});

export interface FluentDataGridStyles {
  /** Spread onto `<DataGrid>` to apply the Fluent look. */
  gridClasses: DataGridClasses;
  /** Passed to the helper renderers. */
  parts: FluentDataGridParts;
}

/**
 * Classes that make `@astroapps/datagrid` render like a Fluent v9 `DataGrid`.
 * Must be used inside a `FluentProvider` so the theme's token custom properties
 * are in scope.
 */
export function useFluentDataGridStyles(
  options: FluentDataGridStyleOptions = {},
): FluentDataGridStyles {
  const { size = "medium", defaultColumnTemplate = "minmax(0, 1fr)" } = options;
  const s = useStyles();
  const names = fluentDataGridClassNames;
  const headerSize =
    size === "medium"
      ? s.headerMedium
      : size === "small"
        ? s.headerSmall
        : s.headerExtraSmall;
  const bodySize =
    size === "medium"
      ? s.bodyMedium
      : size === "small"
        ? s.bodySmall
        : s.bodyExtraSmall;
  return {
    gridClasses: {
      className: clsx(names.grid, s.grid),
      cellClass: s.cell,
      headerCellClass: clsx(names.headerCell, s.headerCell, headerSize),
      bodyCellClass: clsx(names.bodyCell, s.bodyCell, bodySize),
      defaultColumnTemplate,
    },
    parts: {
      selectionCell: s.selectionCell,
      row: s.row,
      rowSelected: s.rowSelected,
      sortButton: s.sortButton,
      sortButtonLabel: s.sortButtonLabel,
      sortIcon: s.sortIcon,
      sortPriority: s.sortPriority,
      filterButton: s.filterButton,
      filterButtonActive: s.filterButtonActive,
    },
  };
}
