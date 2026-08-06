import React from "react";
import { type ColumnDefInit, defaultRenderCell } from "@astroapps/datagrid";
import type { GridSelection } from "@astroapps/datagrid-search";
import { GridCheckbox } from "./Checkbox";
import { ariaDataGridClassNames, type AriaDataGridParts } from "./styles";

export interface AriaSelectionColumnOptions {
  /** Column id, only matters if it would clash with a data column. */
  id?: string;
  columnTemplate?: string;
  rowAriaLabel?: string;
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
  options: AriaSelectionColumnOptions = {},
): ColumnDefInit<T> {
  const {
    id = "__ariaSelect",
    columnTemplate = "44px",
    rowAriaLabel = "Select row",
    allAriaLabel = "Select all rows on this page",
    hideSelectAll,
  } = options;
  const names = ariaDataGridClassNames;
  return {
    id,
    title: "",
    columnTemplate,
    cellClass: parts.selectionCell,
    headerCellClass: names.selectionHeaderCell,
    bodyCellClass: names.selectionCell,
    render: (row) => (
      <GridCheckbox
        checked={selection.isSelected(row)}
        onChange={(checked) => selection.toggle(row, checked)}
        ariaLabel={rowAriaLabel}
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
