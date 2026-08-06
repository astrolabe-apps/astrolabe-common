/**
 * The tailwind classes that make `@astroapps/datagrid` look like a grid.
 *
 * Two things every class here has to survive:
 *
 * 1. **The astrolabe tailwind preset**, which *replaces* `theme.colors` rather
 *    than extending it. Only `primary` / `secondary` / `surface` / `success` /
 *    `danger` / `warning` / `interactive` plus `gray` (slate), `green`, `red`,
 *    `yellow`, `blue`, `black` and `white` resolve. Notably there is no
 *    `neutral`, `zinc` or `slate` — a `border-neutral-300` here would silently
 *    render as nothing, which is what `@astroapps/aria-base` currently does.
 * 2. **Concatenation doesn't decide anything.** `@astroapps/datagrid` joins its
 *    class props with `clsx`, so two utilities setting the same property are
 *    resolved by CSS source order — i.e. by whichever rule tailwind happened to
 *    emit later — and not by which was passed last. Overrides here therefore go
 *    through `tailwind-merge`, which drops the losing utility from the string
 *    rather than trusting the cascade; anything that has to beat a class arriving
 *    through a *different* prop is marked `!`, since this package doesn't get to
 *    reorder that concatenation. See `mergeClasses.ts`.
 */
import type { DataGridClasses } from "@astroapps/datagrid";
import clsx from "clsx";
// The project-configured merge, not tailwind-merge's own — see mergeClasses.ts for
// what it corrects.
import { mergeClasses } from "./mergeClasses";

/** Row density. Metrics follow Fluent's table sizes, which are sensible ones. */
export type AriaDataGridSize = "md" | "sm" | "xs";

/**
 * Stable class names put on the grid and its cells. Not used for styling —
 * they're hooks for CSS overrides, for tests, and for finding a cell in the
 * inspector.
 */
export const ariaDataGridClassNames = {
  grid: "astro-AriaDataGrid",
  headerCell: "astro-AriaDataGrid__headerCell",
  bodyCell: "astro-AriaDataGrid__bodyCell",
  selectionHeaderCell: "astro-AriaDataGrid__selectionHeaderCell",
  selectionCell: "astro-AriaDataGrid__selectionCell",
  row: "astro-AriaDataGrid__row",
  sortButton: "astro-AriaDataGrid__sortButton",
  sortIcon: "astro-AriaDataGrid__sortIcon",
  sortPriority: "astro-AriaDataGrid__sortPriority",
  filterButton: "astro-AriaDataGrid__filterButton",
  popover: "astro-AriaDataGrid__popover",
  pager: "astro-AriaDataGrid__pager",
} as const;

/**
 * Classes for the parts that aren't plain grid cells, passed to the helper
 * renderers so they don't each rebuild them.
 */
export interface AriaDataGridParts {
  /** Overrides the base cell padding — the checkbox column centres instead. */
  selectionCell: string;
  /**
   * The row wrapper. `display: contents`, so these paint through `[&>*]:`
   * variants on the cells rather than on a box of the row's own.
   */
  row: string;
  rowSelected: string;
  /** Added to rows that toggle their own selection when clicked. */
  rowClickable: string;
  /** The checkbox label wrapper; `checkboxBox` is the square that's drawn. */
  checkbox: string;
  checkboxBox: string;
  checkboxBoxSelected: string;
  /** Single-select filter options, drawn as a circle rather than a square. */
  radioBox: string;
  radioDot: string;
  sortButton: string;
  sortButtonLabel: string;
  sortIcon: string;
  /** The "sorted 2nd" badge, shown only in multi-sort. */
  sortPriority: string;
  filterButton: string;
  filterButtonActive: string;
  /** The in-grid loading / error / no-data row. */
  message: string;
  popover: string;
  popoverSearch: string;
  popoverOptions: string;
  popoverMessage: string;
  popoverFooter: string;
  popoverButton: string;
  /** Apply, in deferred mode. The only filled button this package draws. */
  popoverButtonPrimary: string;
  popoverInput: string;
  optionList: string;
  option: string;
  optionLabel: string;
  optionCount: string;
  pager: string;
  pagerRange: string;
  pagerButton: string;
  pagerPageSize: string;
}

/** Every class this package puts anywhere, all overridable. */
export type AriaDataGridClassOverrides = Partial<
  DataGridClasses & AriaDataGridParts
>;

export interface AriaDataGridStyleOptions {
  /** Row density. Defaults to "md". */
  size?: AriaDataGridSize;
  /** Track sizing for columns without an explicit `columnTemplate`. */
  defaultColumnTemplate?: string;
  /**
   * Per-part overrides, merged with `tailwind-merge` so a conflicting utility
   * here replaces the default rather than fighting it in the cascade.
   */
  classes?: AriaDataGridClassOverrides;
}

export interface AriaDataGridStyles {
  /** Spread onto `<DataGrid>`. */
  gridClasses: DataGridClasses;
  /** Passed to the helper renderers. */
  parts: AriaDataGridParts;
}

const focusRing =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary-600";

/**
 * A cell is a flex box that clips: the grid template decides the width, so
 * content that doesn't fit is the content's problem, not the layout's.
 *
 * `box-content` makes the heights below mean *content* height, so a row is
 * height + 1px of divider. Without it every row is 1px short and a long grid
 * drifts out of alignment with anything measured beside it.
 */
const cellBase =
  "flex items-center min-w-0 overflow-hidden box-content px-2 border-b border-surface-200";

/**
 * The size and selection-column classes reach a cell through a *different*
 * `DataGridClasses` prop than `cellBase` does, and `@astroapps/datagrid` clsx-es
 * the two together — so whichever of `border-b` / `border-b-0` tailwind emitted
 * later wins, whatever this package intended. `!` is the only way to be sure from
 * here, since reordering that concatenation isn't ours to do.
 */
const headerSizes: Record<AriaDataGridSize, string> = {
  md: "h-8 font-normal text-surface-700",
  sm: "h-8 font-normal text-surface-700",
  // Denser grids lose the header divider too, so the header reads as a label
  // rather than a first row.
  xs: "h-8 font-normal text-xs text-surface-700 !border-b-0",
};

const bodySizes: Record<AriaDataGridSize, string> = {
  md: "h-11",
  sm: "h-[34px]",
  xs: "h-8 text-xs !border-b-0",
};

/**
 * Not a hook: there's no theme context to read and nothing to memoise, so this
 * is safe to call from a render callback. Same reasoning as `makeGridSelection`.
 */
export function ariaDataGridClasses(
  options: AriaDataGridStyleOptions = {},
): AriaDataGridStyles {
  const {
    size = "md",
    defaultColumnTemplate = "minmax(0, 1fr)",
    classes = {},
  } = options;
  const names = ariaDataGridClassNames;

  /** Default first, override second, so the override wins in the merge. */
  const part = (defaults: string, override?: string) =>
    override ? mergeClasses(defaults, override) : defaults;

  return {
    gridClasses: {
      className: clsx(
        names.grid,
        part("w-full text-sm text-surface-900 bg-white", classes.className),
      ),
      cellClass: part(cellBase, classes.cellClass),
      headerCellClass: clsx(
        names.headerCell,
        part(headerSizes[size], classes.headerCellClass),
      ),
      bodyCellClass: clsx(
        names.bodyCell,
        part(bodySizes[size], classes.bodyCellClass),
      ),
      ...(classes.lastRowClass !== undefined && {
        lastRowClass: classes.lastRowClass,
      }),
      ...(classes.lastColumnClass !== undefined && {
        lastColumnClass: classes.lastColumnClass,
      }),
      defaultColumnTemplate:
        classes.defaultColumnTemplate ?? defaultColumnTemplate,
    },
    parts: {
      // `!px-0` for the same reason as the sizes above: this arrives as the
      // column's `cellClass` and has to beat the grid-wide `px-2`.
      selectionCell: part("!px-0 justify-center", classes.selectionCell),
      // Hover and selection are painted on the children because the wrapper is
      // `display: contents` and paints nothing itself. `:hover` still resolves
      // up the ancestor chain, so `[&>*]` works from here.
      row: part(
        "[&:hover>*]:bg-surface-50 [&:active>*]:bg-surface-100",
        classes.row,
      ),
      rowSelected: part(
        "[&>*]:bg-primary-50 [&>*]:border-b-transparent [&:hover>*]:bg-primary-100 [&:active>*]:bg-primary-200",
        classes.rowSelected,
      ),
      rowClickable: part("[&>*]:cursor-pointer", classes.rowClickable),
      checkbox: part(
        "group flex items-center shrink-0 cursor-pointer",
        classes.checkbox,
      ),
      checkboxBox: part(
        clsx(
          "flex items-center justify-center w-4 h-4 rounded-sm border border-surface-400 bg-white text-white",
          "group-data-[focus-visible]:outline group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-1 group-data-[focus-visible]:outline-secondary-600",
        ),
        classes.checkboxBox,
      ),
      checkboxBoxSelected: part(
        "bg-primary-600 border-primary-600",
        classes.checkboxBoxSelected,
      ),
      radioBox: part(
        clsx(
          "flex items-center justify-center w-4 h-4 shrink-0 rounded-full border border-surface-400 bg-white",
          "group-data-[focus-visible]:outline group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-1 group-data-[focus-visible]:outline-secondary-600",
        ),
        classes.radioBox,
      ),
      radioDot: part("w-2 h-2 rounded-full bg-primary-600", classes.radioDot),
      sortButton: part(
        clsx(
          "flex items-center gap-1 w-full h-full min-w-0 p-0 m-0 bg-transparent border-0 rounded text-left",
          // A button doesn't inherit the cell's font, so it's asked for
          // explicitly — but not `font: inherit`, which would drag line-height
          // along and make the label sit differently from a plain cell's text.
          "[font-family:inherit] [font-size:inherit] [font-weight:inherit] text-inherit leading-normal",
          // Tailwind's preflight has `button, select { text-transform: none }`, so
          // a `uppercase` a caller puts on `headerCellClass` would reach the cell
          // and stop at the title inside it. Inheriting explicitly makes the
          // documented override path do what it looks like it does.
          "[text-transform:inherit]",
          focusRing,
        ),
        classes.sortButton,
      ),
      sortButtonLabel: part("truncate", classes.sortButtonLabel),
      sortIcon: part(
        "flex items-center shrink-0 [&>svg]:w-3 [&>svg]:h-3",
        classes.sortIcon,
      ),
      sortPriority: part(
        "text-[10px] text-surface-500 shrink-0",
        classes.sortPriority,
      ),
      // Sits outside the sort button — nesting interactive elements is invalid —
      // and is sized to its icon so it can't grow the header row.
      filterButton: part(
        clsx(
          "flex items-center justify-center shrink-0 w-5 h-5 p-0 rounded",
          "bg-transparent border-0 cursor-pointer text-surface-500 hover:bg-surface-100",
          focusRing,
        ),
        classes.filterButton,
      ),
      filterButtonActive: part("text-primary-600", classes.filterButtonActive),
      message: part(
        "flex items-center gap-2 h-11 px-2 text-surface-500",
        classes.message,
      ),
      // The options scroll, not the popup: the search box stays reachable at the
      // top and Clear/Apply stay put at the bottom however many values there are.
      popover: part(
        "flex flex-col gap-2 max-h-80 min-w-[180px] max-w-[280px] overflow-hidden p-2 text-sm text-surface-900 bg-white rounded-lg border border-surface-200 shadow-lg",
        classes.popover,
      ),
      popoverSearch: part(
        clsx(
          "flex items-center gap-1 shrink-0 px-2 h-7 rounded border border-surface-300 bg-white",
          "focus-within:border-secondary-600",
        ),
        classes.popoverSearch,
      ),
      popoverOptions: part(
        "flex flex-col grow shrink min-h-0 overflow-y-auto py-0.5",
        classes.popoverOptions,
      ),
      popoverMessage: part(
        "flex items-center gap-2 text-surface-500",
        classes.popoverMessage,
      ),
      popoverFooter: part(
        "flex items-center justify-between gap-2 shrink-0 pt-1 border-t border-surface-200",
        classes.popoverFooter,
      ),
      popoverButton: part(
        clsx(
          "flex items-center gap-1 h-7 px-2 rounded bg-transparent border-0 cursor-pointer text-sm text-surface-700",
          "hover:bg-surface-100 disabled:text-surface-400 disabled:cursor-default disabled:hover:bg-transparent",
          focusRing,
        ),
        classes.popoverButton,
      ),
      popoverButtonPrimary: part(
        clsx(
          "h-7 px-2 rounded border-0 cursor-pointer text-sm text-white bg-primary-600 hover:bg-primary-700",
          focusRing,
        ),
        classes.popoverButtonPrimary,
      ),
      popoverInput: part(
        // `border-0 p-0` for the same reason the page-size select needs
        // `appearance-auto`: `@tailwindcss/forms` styles bare inputs too, and its
        // border and padding would draw a second box inside `popoverSearch`'s.
        "min-w-0 grow border-0 p-0 bg-transparent outline-none text-sm placeholder:text-surface-400",
        classes.popoverInput,
      ),
      optionList: part("flex flex-col gap-0.5 min-w-0", classes.optionList),
      option: part(
        "flex items-center gap-2 min-w-0 cursor-pointer rounded px-1 py-0.5 hover:bg-surface-50",
        classes.option,
      ),
      optionLabel: part("grow truncate", classes.optionLabel),
      optionCount: part(
        "shrink-0 text-xs text-surface-500",
        classes.optionCount,
      ),
      pager: part(
        "flex items-center justify-end gap-2 pt-2 text-sm text-surface-700",
        classes.pager,
      ),
      pagerRange: part("shrink-0", classes.pagerRange),
      pagerButton: part(
        clsx(
          "flex items-center justify-center w-7 h-7 rounded bg-transparent border-0 cursor-pointer text-surface-700",
          "hover:bg-surface-100 disabled:text-surface-400 disabled:cursor-default disabled:hover:bg-transparent",
          focusRing,
        ),
        classes.pagerButton,
      ),
      pagerPageSize: part(
        clsx(
          // `appearance-auto bg-none` undoes what a host stylesheet does to
          // selects. `@tailwindcss/forms` — which the astrolabe preset loads —
          // sets `appearance: none` and draws its own chevron as a
          // background-image. Suppressing only the image leaves a control with no
          // arrow at all, sized to its text: a 27px box with "10" wedged into it.
          // Restoring the native appearance brings back the platform arrow and the
          // intrinsic width that reserves room for it, and `bg-none` then keeps the
          // plugin's chevron from being drawn on top of it.
          // `py-0` too: the plugin's 0.5rem of vertical padding pushes the text
          // past the 28px box and clips it.
          "h-7 appearance-auto rounded border border-surface-300 bg-white bg-none pl-2 pr-1 py-0 text-sm text-surface-700",
          focusRing,
        ),
        classes.pagerPageSize,
      ),
    },
  };
}
