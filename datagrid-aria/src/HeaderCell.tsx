import React, { type ReactNode } from "react";
import clsx from "clsx";
import type { ColumnDef } from "@astroapps/datagrid";
import type { FilterPopupProps, GridSearch } from "@astroapps/datagrid-search";
import { ariaDataGridClassNames, type AriaDataGridParts } from "./styles";
import { AriaFilterPopover } from "./FilterPopover";
import { resolveIcons, type AriaDataGridIcons } from "./icons";

export interface AriaHeaderContentOptions<T, D = unknown> {
  /** Turn sorting off grid-wide. Per-column, omit `sortField` instead. */
  sortable?: boolean;
  /** Turn filtering off grid-wide. */
  filterable?: boolean;
  /** Replaces every column's popup body. A column's own `render` wins over this. */
  renderFilterPopup?: (props: FilterPopupProps<T>) => ReactNode;
  /**
   * Replaces the funnel button *and* its popup, for a column that wants an inline
   * control instead. Return undefined to fall back to the standard popover.
   */
  renderFilterControl?: (
    column: ColumnDef<T, D>,
    search: GridSearch<T, D>,
  ) => ReactNode;
  /** Swap any of the inline SVGs for your own icon set. */
  icons?: AriaDataGridIcons;
}

/**
 * `renderHeaderContent` for `<DataGrid>`: the title in a button, an arrow when
 * sorted, and the filter control as a *sibling* — nesting interactive elements
 * would be invalid HTML.
 *
 * The title is always a button, sortable or not, so the header row doesn't change
 * height or alignment between columns that sort and columns that don't.
 */
export function ariaHeaderContent<T, D = unknown>(
  search: GridSearch<T, D>,
  parts: AriaDataGridParts,
  options: AriaHeaderContentOptions<T, D> = {},
): (column: ColumnDef<T, D>) => ReactNode {
  const {
    sortable = true,
    filterable = true,
    renderFilterPopup,
    renderFilterControl,
    icons,
  } = options;
  const names = ariaDataGridClassNames;
  const resolved = resolveIcons(icons);

  return (column) => {
    const canSort = sortable && search.sort.isSortable(column);
    const direction = canSort ? search.sort.direction(column) : undefined;
    const priority = canSort ? search.sort.priority(column) : undefined;

    return (
      <>
        <button
          type="button"
          className={clsx(names.sortButton, parts.sortButton)}
          // Passing the event through is what makes shift-click multi-sort work
          // in `mode: "shift"`; other modes ignore it.
          onClick={canSort ? (ev) => search.sort.toggle(column, ev) : undefined}
          aria-sort={
            direction === "asc"
              ? "ascending"
              : direction === "desc"
                ? "descending"
                : undefined
          }
        >
          <span className={parts.sortButtonLabel}>{column.title}</span>
          {direction && (
            <span className={clsx(names.sortIcon, parts.sortIcon)}>
              {direction === "asc"
                ? resolved.sortAscending
                : resolved.sortDescending}
            </span>
          )}
          {priority !== undefined && (
            <span className={clsx(names.sortPriority, parts.sortPriority)}>
              {priority}
            </span>
          )}
        </button>
        {filterable && renderFilter(column)}
      </>
    );
  };

  function renderFilter(column: ColumnDef<T, D>) {
    const custom = renderFilterControl?.(column, search);
    if (custom !== undefined && custom !== null) return custom;
    // No option source resolves ⇒ no funnel, rather than a button opening an
    // empty popup.
    if (!search.canFilter(column)) return null;
    return (
      <AriaFilterPopover
        search={search}
        column={column}
        parts={parts}
        renderBody={renderFilterPopup}
        icons={icons}
      />
    );
  }
}
