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
  /**
   * Clicking anywhere on a row toggles its selection, as Fluent's own DataGrid
   * does. On by default wherever there's a `selection`; pass false for a grid
   * whose rows click for some other reason — drilling in, expanding — where
   * selection should stay the checkbox's job.
   *
   * Mouse only: the checkbox column is the keyboard path, already focusable and
   * labelled. Clicks that land on interactive content (the checkbox itself, a
   * link, a button) are left to it, and a click that ends a text selection inside
   * the row doesn't count either.
   */
  selectOnRowClick?: boolean;
}

/** Cell content that owns its own clicks, so a row click shouldn't also fire. */
const INTERACTIVE =
  "a,button,input,select,textarea,label,[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=menuitem],[contenteditable=true]";

/**
 * Whether this click was the user reading rather than clicking — dragging across
 * a cell to select its text ends in a click, which shouldn't flip a checkbox.
 */
function endedTextSelection(within: HTMLElement) {
  const selection = window.getSelection();
  return (
    !!selection &&
    !selection.isCollapsed &&
    !!selection.anchorNode &&
    within.contains(selection.anchorNode)
  );
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
        className={clsx(
          fluentDataGridClassNames.row,
          parts.row,
          clickToSelect && parts.rowClickable,
          selected?.(row, rowIndex) && parts.rowSelected,
        )}
        // The wrapper paints no box, but events still bubble to it from the cells.
        onClick={
          clickToSelect
            ? (event) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest(INTERACTIVE)) return;
                if (endedTextSelection(event.currentTarget)) return;
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
