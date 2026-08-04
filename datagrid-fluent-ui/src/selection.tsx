import React from "react";
import clsx from "clsx";
import { Checkbox } from "@fluentui/react-components";
import { type ColumnDefInit, defaultRenderCell } from "@astroapps/datagrid";
import { fluentDataGridClassNames, type FluentDataGridParts } from "./styles";

/**
 * Selection state, consumed by both the selection column and the row wrapper so
 * a selected row is painted as well as ticked. Build one with
 * `arraySelection` (plain state) or `controlSelection` (react-typed-forms).
 */
export interface FluentSelection<T> {
  isSelected(row: T): boolean;
  toggle(row: T): void;
  allSelected: boolean;
  someSelected: boolean;
  toggleAll(): void;
}

export interface ArraySelectionOptions<T> {
  rows: T[];
  getId: (row: T) => string;
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

/** `FluentSelection` over a plain array of selected ids. */
export function arraySelection<T>({
  rows,
  getId,
  selectedIds,
  onChange,
}: ArraySelectionOptions<T>): FluentSelection<T> {
  const allSelected = rows.length > 0 && selectedIds.length >= rows.length;
  return {
    isSelected: (row) => selectedIds.includes(getId(row)),
    toggle: (row) => {
      const id = getId(row);
      onChange(
        selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id],
      );
    },
    allSelected,
    someSelected: selectedIds.length > 0 && !allSelected,
    toggleAll: () => onChange(allSelected ? [] : rows.map(getId)),
  };
}

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
 * A leading checkbox column matching Fluent's selection cell. Pass the result
 * to `columnDefinitions`.
 */
export function fluentSelectionColumn<T>(
  selection: FluentSelection<T>,
  parts: FluentDataGridParts,
  options: FluentSelectionColumnOptions = {},
): ColumnDefInit<T> {
  const {
    id = "__fluentSelect",
    columnTemplate = "44px",
    rowAriaLabel = "Select row",
    allAriaLabel = "Select all rows",
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
        onChange={() => selection.toggle(row)}
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
            aria-label={allAriaLabel}
          />
        ),
      }),
  };
}
