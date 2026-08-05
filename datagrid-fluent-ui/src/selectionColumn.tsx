import React from "react";
import clsx from "clsx";
import { Checkbox } from "@fluentui/react-components";
import { type ColumnDefInit, defaultRenderCell } from "@astroapps/datagrid";
import { fluentDataGridClassNames, type FluentDataGridParts } from "./styles";
import type { GridSelection } from "./selection";

export interface FluentSelectionColumnOptions {
  /** Column id, only matters if it would clash with a data column. */
  id?: string;
  /** Fluent's selection column is 44px wide. */
  columnTemplate?: string;
  rowAriaLabel?: string;
  allAriaLabel?: string;
  /** Omit the "select all" checkbox, e.g. for single-select grids. */
  hideSelectAll?: boolean;
}

/**
 * A leading checkbox column matching Fluent's selection cell. Pass the result to
 * `columnDefinitions`, or let the composition hook prepend it.
 */
export function fluentSelectionColumn<T>(
  selection: GridSelection<T>,
  parts: FluentDataGridParts,
  options: FluentSelectionColumnOptions = {},
): ColumnDefInit<T> {
  const {
    id = "__fluentSelect",
    columnTemplate = "44px",
    rowAriaLabel = "Select row",
    allAriaLabel = "Select all rows on this page",
    hideSelectAll,
  } = options;
  const names = fluentDataGridClassNames;
  return {
    id,
    title: "",
    columnTemplate,
    cellClass: parts.selectionCell,
    headerCellClass: names.selectionHeaderCell,
    bodyCellClass: names.selectionCell,
    render: (row) => (
      <Checkbox
        checked={selection.isSelected(row)}
        onChange={(_, d) => selection.toggle(row, !!d.checked)}
        aria-label={rowAriaLabel}
      />
    ),
    // The header cell renders its own content, so it ignores whatever
    // `renderHeaderContent` produced for this column.
    renderHeader: (p) =>
      defaultRenderCell({
        ...p,
        className: clsx(p.className),
        children: hideSelectAll ? null : (
          <Checkbox
            checked={
              selection.allSelected
                ? true
                : selection.someSelected
                  ? "mixed"
                  : false
            }
            onChange={() => selection.toggleAll()}
            // "on this page" because that's the scope — see selection.ts.
            aria-label={allAriaLabel}
          />
        ),
      }),
  };
}
