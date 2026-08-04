import React, { type Key, type ReactNode } from "react";
import clsx from "clsx";
import { fluentDataGridClassNames, type FluentDataGridParts } from "./styles";
import type { GridSelection } from "./selection";

export interface FluentRowWrapperOptions<T> {
  rows?: T[];
  /** Alternative to `rows`, for virtualised/lazy grids. */
  getRow?: (index: number) => T;
  rowKey?: (row: T, index: number) => Key;
  selection?: GridSelection<T>;
  /** Overrides `selection` if you track selected rows some other way. */
  isSelected?: (row: T, index: number) => boolean;
}

/**
 * `wrapBodyRow` for `<DataGrid>`, wrapping each row's cells in a
 * `display: contents` element so hover and selection can be painted across the
 * whole row.
 *
 * The wrapper generates no box of its own — that's what keeps the cells as
 * direct grid items with their explicit grid placement — so the styles target
 * its children instead. `:hover` still works because hover applies up the DOM
 * ancestor chain regardless of `display`.
 */
export function fluentRowWrapper<T>(
  options: FluentRowWrapperOptions<T>,
  parts: FluentDataGridParts,
): (rowIndex: number, render: (row: T, key: Key) => ReactNode) => ReactNode {
  const { rows, getRow, rowKey, selection, isSelected } = options;
  const rowAt = getRow ?? ((index: number) => rows![index]);
  const selected =
    isSelected ?? (selection && ((row: T) => selection.isSelected(row)));
  return (rowIndex, render) => {
    const row = rowAt(rowIndex);
    const key = rowKey?.(row, rowIndex) ?? rowIndex;
    return (
      <div
        key={key}
        style={{ display: "contents" }}
        className={clsx(
          fluentDataGridClassNames.row,
          parts.row,
          selected?.(row, rowIndex) && parts.rowSelected,
        )}
      >
        {render(row, key)}
      </div>
    );
  };
}
