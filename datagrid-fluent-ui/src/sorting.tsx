import React, { type ReactNode } from "react";
import clsx from "clsx";
import { ArrowDownRegular, ArrowUpRegular } from "@fluentui/react-icons";
import {
  type ColumnDef,
  columnComparator,
  columnSearching,
  findColumn,
  rotateColumnSort,
  sortDirectionChar,
  sortFieldDirection,
} from "@astroapps/datagrid";
import { findSortField, sortBySortFields } from "@astroapps/searchstate";
import { fluentDataGridClassNames, type FluentDataGridParts } from "./styles";

export type FluentSortDirection = "ascending" | "descending";

/**
 * Sorting, decoupled from how the state is stored. Columns are identified by
 * whole `ColumnDef` so that both models work: `columnIdSort` keys off `id`,
 * while `searchStateSort` keys off `sortField` the way `@astroapps/searchstate`
 * does.
 */
export interface FluentSort {
  /** Current direction of this column, or undefined when unsorted. */
  direction(column: ColumnDef<any, any>): FluentSortDirection | undefined;
  /** Cycle this column's sort, as clicking a Fluent header does. */
  toggle(column: ColumnDef<any, any>): void;
  /** Whether this column offers sorting at all. */
  isSortable(column: ColumnDef<any, any>): boolean;
  /**
   * Client-side sort, for grids whose rows aren't already sorted by a server.
   * Ignore it when the data source does the sorting.
   */
  sortRows<T>(rows: T[], columns: ColumnDef<T, any>[]): T[];
}

export interface FluentSortState {
  columnId?: string;
  direction: FluentSortDirection;
}

/** Sortability marker used by both adapters, matching astrolabe's convention. */
function hasSortField(column: ColumnDef<any, any>) {
  return !!column.sortField;
}

/**
 * Single-column sorting keyed off `ColumnDef.id`, closest to Fluent's own
 * `sortState` prop. Columns still need a `sortField` set to be sortable.
 */
export function columnIdSort(
  state: FluentSortState | undefined,
  onChange: (next: FluentSortState) => void,
): FluentSort {
  return {
    isSortable: hasSortField,
    direction: (column) =>
      state?.columnId === column.id ? state.direction : undefined,
    toggle: (column) =>
      onChange({
        columnId: column.id,
        direction:
          state?.columnId === column.id && state.direction === "ascending"
            ? "descending"
            : "ascending",
      }),
    sortRows: (rows, columns) => {
      if (!state?.columnId) return rows;
      const compare = columnComparator(
        findColumn(columns, (c) => c.id === state.columnId),
      );
      if (!compare) return rows;
      const dir = state.direction === "ascending" ? 1 : -1;
      return [...rows].sort((a, b) => dir * compare(a, b));
    },
  };
}

export interface SearchStateSortOptions {
  /** `@astroapps/searchstate` sort fields, e.g. `["afile"]`. */
  sort: string[] | null | undefined;
  onChange: (next: string[]) => void;
  /**
   * Called whenever the sort changes, to reset paging — `@astroapps/searchstate`
   * consumers normally zero `offset` here.
   */
  onSortChanged?: () => void;
  /** Keep secondary sorts (searchstate's default). Off for Fluent's 1-column look. */
  multiple?: boolean;
  /**
   * Include `rotateSort`'s third "unsorted" step in the cycle, as the rest of the
   * repo's searchstate consumers do. Off by default, so header clicks just flip
   * ascending ↔ descending like Fluent's own DataGrid.
   */
  cycleUnsorted?: boolean;
}

/**
 * Sorting backed by `@astroapps/searchstate`'s `sort: string[]` model, where
 * each entry is an `"a"`/`"d"` direction prefix followed by the column's
 * `sortField`.
 */
export function searchStateSort({
  sort,
  onChange,
  onSortChanged,
  multiple,
  cycleUnsorted,
}: SearchStateSortOptions): FluentSort {
  const current = sort ?? [];
  return {
    isSortable: hasSortField,
    direction: (column) => {
      const dir = sortFieldDirection(current, column.sortField);
      return dir ? (dir === "asc" ? "ascending" : "descending") : undefined;
    },
    toggle: (column) => {
      const field = column.sortField;
      if (!field) return;
      const rotated = rotateColumnSort(column)(current);
      // rotateSort's last step drops the field entirely. Unless that unsorted
      // step is wanted, put it back at the default direction so the cycle is
      // the two-state ascending ↔ descending one Fluent uses.
      const next =
        cycleUnsorted || findSortField(rotated, field)
          ? rotated
          : [sortDirectionChar(column.defaultSort) + field, ...rotated];
      onChange(multiple ? next : next.slice(0, 1));
      onSortChanged?.();
    },
    sortRows: (rows, columns) =>
      sortBySortFields(columnSearching(columns).getComparison, current, rows),
  };
}

export interface FluentHeaderContentOptions {
  /** Override which columns render a sort control. */
  isSortable?: (column: ColumnDef<any, any>) => boolean;
  /**
   * Rendered as a sibling of the sort button — a filter control, typically
   * `FluentFilterPopover`. It can't go *inside* the button, since nesting
   * interactive elements is invalid.
   */
  renderFilter?: (column: ColumnDef<any, any>) => ReactNode;
}

/**
 * `renderHeaderContent` for `<DataGrid>`, matching Fluent's header cell: the
 * title always sits in a button (as Fluent's does, sortable or not), with an
 * arrow appearing when the column is sorted.
 */
export function fluentHeaderContent(
  sort: FluentSort | undefined,
  parts: FluentDataGridParts,
  options: FluentHeaderContentOptions = {},
): (column: ColumnDef<any, any>) => ReactNode {
  const names = fluentDataGridClassNames;
  return (column) => {
    const sortable = !!sort && (options.isSortable ?? sort.isSortable)(column);
    const direction = sortable ? sort!.direction(column) : undefined;
    const filter = options.renderFilter?.(column);
    return (
      <>
        <button
          type="button"
          className={clsx(names.sortButton, parts.sortButton)}
          onClick={sortable ? () => sort!.toggle(column) : undefined}
          aria-sort={direction}
        >
          <span className={parts.sortButtonLabel}>{column.title}</span>
          {direction && (
            <span className={clsx(names.sortIcon, parts.sortIcon)}>
              {direction === "ascending" ? (
                <ArrowUpRegular />
              ) : (
                <ArrowDownRegular />
              )}
            </span>
          )}
        </button>
        {filter}
      </>
    );
  };
}
