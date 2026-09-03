import React from "react";
import { type ColumnDefInit, defaultRenderCell } from "@astroapps/datagrid";
import type { GridSelection } from "@astroapps/datagrid-search";
import { GridCheckbox } from "./Checkbox";
import { ariaDataGridClassNames, type AriaDataGridParts } from "./styles";

export interface AriaSelectionColumnOptions<T = unknown> {
  /** Column id, only matters if it would clash with a data column. */
  id?: string;
  columnTemplate?: string;
  /**
   * Label for each row's checkbox. A constant makes every row's checkbox
   * identical to assistive tech and to `getByLabelText`, so pass a function to
   * name the row it selects — `(row) => `Select ${row.name}``.
   */
  rowAriaLabel?: string | ((row: T, index: number) => string);
  allAriaLabel?: string;
  /** Omit the "select all" checkbox, e.g. for single-select grids. */
  hideSelectAll?: boolean;
}

/**
 * A leading checkbox column. Pass the result to `columnDefinitions`, or let
 * `useAriaDataGrid` prepend it.
 */
export function ariaSelectionColumn<T>(
  selection: GridSelection<T>,
  parts: AriaDataGridParts,
  options: AriaSelectionColumnOptions<T> = {},
): ColumnDefInit<T> {
  const {
    id = "__ariaSelect",
    columnTemplate = "44px",
    rowAriaLabel = "Select row",
    allAriaLabel = "Select all rows on this page",
    hideSelectAll,
  } = options;
  const labelForRow = (row: T, index: number) =>
    typeof rowAriaLabel === "function" ? rowAriaLabel(row, index) : rowAriaLabel;
  const names = ariaDataGridClassNames;
  return {
    id,
    title: "",
    columnTemplate,
    cellClass: parts.selectionCell,
    headerCellClass: names.selectionHeaderCell,
    bodyCellClass: names.selectionCell,
    render: (row, rowIndex) => (
      <GridCheckbox
        checked={selection.isSelected(row)}
        onChange={(checked) => selection.toggle(row, checked)}
        ariaLabel={labelForRow(row, rowIndex)}
        parts={parts}
      />
    ),
    // The header cell renders its own content, so it ignores whatever
    // `renderHeaderContent` produced for this column.
    renderHeader: (p) =>
      defaultRenderCell({
        ...p,
        children: hideSelectAll ? null : (
          <GridCheckbox
            checked={selection.allSelected}
            indeterminate={selection.someSelected}
            onChange={() => selection.toggleAll()}
            // "on this page" because that's the scope — see the selection docs
            // in datagrid-search.
            ariaLabel={allAriaLabel}
            parts={parts}
          />
        ),
      }),
  };
}
