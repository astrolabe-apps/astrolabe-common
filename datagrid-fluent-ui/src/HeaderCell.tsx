import React, { type ReactNode } from "react";
import clsx from "clsx";
import { ArrowDownRegular, ArrowUpRegular } from "@fluentui/react-icons";
import type { ColumnDef } from "@astroapps/datagrid";
import type { FilterPopupProps, GridSearch } from "@astroapps/datagrid-search";
import { fluentDataGridClassNames, type FluentDataGridParts } from "./styles";
import { FluentFilterPopover } from "./FilterPopover";

export interface FluentHeaderContentOptions<T, D = unknown> {
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
  /**
   * Appended after the filter control, for anything a column wants in its header
   * that isn't sorting or filtering — an info tooltip, a units badge, a link.
   * Return undefined for the columns that want nothing. Sits outside the sort
   * button, so it may be interactive; give it `shrink-0` so a long title can't
   * squeeze it away.
   */
  renderHeaderExtra?: (
    column: ColumnDef<T, D>,
    search: GridSearch<T, D>,
  ) => ReactNode;
}

/**
 * `renderHeaderContent` for `<DataGrid>`, matching Fluent's header cell: the
 * title always sits in a button (as Fluent's does, sortable or not), with an
 * arrow when sorted, and the filter control as a *sibling* — nesting interactive
 * elements would be invalid HTML.
 */
export function fluentHeaderContent<T, D = unknown>(
  search: GridSearch<T, D>,
  parts: FluentDataGridParts,
  options: FluentHeaderContentOptions<T, D> = {},
): (column: ColumnDef<T, D>) => ReactNode {
  const {
    sortable = true,
    filterable = true,
    renderFilterPopup,
    renderFilterControl,
    renderHeaderExtra,
  } = options;
  const names = fluentDataGridClassNames;

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
              {direction === "asc" ? <ArrowUpRegular /> : <ArrowDownRegular />}
            </span>
          )}
          {priority !== undefined && (
            <span className={clsx(names.sortPriority, parts.sortPriority)}>
              {priority}
            </span>
          )}
        </button>
        {filterable && renderFilter(column)}
        {renderHeaderExtra?.(column, search)}
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
      <FluentFilterPopover
        search={search}
        column={column}
        parts={parts}
        renderBody={renderFilterPopup}
      />
    );
  }
}
