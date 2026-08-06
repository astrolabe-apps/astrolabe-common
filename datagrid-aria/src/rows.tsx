import React, { type Key, type ReactNode } from "react";
import { mergeClasses } from "./mergeClasses";
import {
  shouldIgnoreRowClick,
  type GridSelection,
} from "@astroapps/datagrid-search";
import { ariaDataGridClassNames, type AriaDataGridParts } from "./styles";

export interface AriaRowWrapperOptions<T> {
  rows?: T[];
  /** Alternative to `rows`, for virtualised/lazy grids. */
  getRow?: (index: number) => T;
  rowKey?: (row: T, index: number) => Key;
  selection?: GridSelection<T>;
  /** Overrides `selection` if you track selected rows some other way. */
  isSelected?: (row: T, index: number) => boolean;
  /**
   * Clicking anywhere on a row toggles its selection. On by default wherever
   * there's a `selection`; pass false for a grid whose rows click for some other
   * reason — drilling in, expanding — where selection should stay the checkbox's
   * job.
   *
   * Mouse only: the checkbox column is the keyboard path, already focusable and
   * labelled. Which clicks don't count is `shouldIgnoreRowClick`'s call.
   */
  selectOnRowClick?: boolean;
}

/**
 * `wrapBodyRow` for `<DataGrid>`, wrapping each row's cells in a
 * `display: contents` element so hover and selection can be painted across the
 * whole row.
 *
 * The wrapper generates no box of its own — that's what keeps the cells as direct
 * grid items with their explicit grid placement — so the classes target its
 * children with `[&>*]:`. `:hover` still works because hover applies up the DOM
 * ancestor chain regardless of `display`.
 */
export function ariaRowWrapper<T>(
  options: AriaRowWrapperOptions<T>,
  parts: AriaDataGridParts,
): (rowIndex: number, render: (row: T, key: Key) => ReactNode) => ReactNode {
  const {
    rows,
    getRow,
    rowKey,
    selection,
    isSelected,
    selectOnRowClick = true,
  } = options;
  const rowAt = getRow ?? ((index: number) => rows![index]);
  const selected =
    isSelected ?? (selection && ((row: T) => selection.isSelected(row)));
  const clickToSelect = selectOnRowClick && selection;
  return (rowIndex, render) => {
    const row = rowAt(rowIndex);
    const key = rowKey?.(row, rowIndex) ?? rowIndex;
    return (
      <div
        key={key}
        style={{ display: "contents" }}
        // Merged, not concatenated: a selected row's hover colour has to beat the
        // unselected one, and tailwind emits them in the losing order.
        className={mergeClasses(
          ariaDataGridClassNames.row,
          parts.row,
          clickToSelect && parts.rowClickable,
          selected?.(row, rowIndex) && parts.rowSelected,
        )}
        // The wrapper paints no box, but events still bubble to it from the cells.
        onClick={
          clickToSelect
            ? (event) => {
                if (shouldIgnoreRowClick(event)) return;
                selection.toggle(row);
              }
            : undefined
        }
      >
        {render(row, key)}
      </div>
    );
  };
}
