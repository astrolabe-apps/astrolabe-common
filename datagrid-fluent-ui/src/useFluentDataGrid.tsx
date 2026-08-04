/**
 * Bundles this package's pieces into props for `@astroapps/datagrid`.
 *
 * Everything here is derived from a `GridSearch` — the composition holds no state
 * and makes no decisions about searching, which is what keeps the renderer
 * swappable.
 */
import React, { type Key } from "react";
import { RenderControl } from "@react-typed-forms/core";
import type {
  ColumnDef,
  ColumnDefInit,
  DataGridClasses,
  DataGridProps,
} from "@astroapps/datagrid";
import { columnDefinitions } from "@astroapps/datagrid";
import type { GridSearch } from "@astroapps/datagrid-search";
import {
  useFluentDataGridStyles,
  type FluentDataGridParts,
  type FluentDataGridStyleOptions,
} from "./styles";
import {
  fluentSelectionColumn,
  type FluentSelectionColumnOptions,
} from "./selectionColumn";
import {
  fluentHeaderContent,
  type FluentHeaderContentOptions,
} from "./HeaderCell";
import { fluentRowWrapper } from "./rows";
import type { GridSelection } from "./selection";

export interface UseFluentDataGridOptions<T, D = unknown>
  extends FluentDataGridStyleOptions, FluentHeaderContentOptions<T, D> {
  /** Adds a leading checkbox column and paints selected rows. */
  selection?: GridSelection<T>;
  selectionColumn?: FluentSelectionColumnOptions;
  /** Row keys, so React reorders rather than rebuilds on sort. */
  rowKey?: (row: T, index: number) => Key;
}

export interface FluentDataGridBundle<T, D = unknown> {
  /** Spread onto `<DataGrid>`: classes, header content, row and cell wrappers. */
  gridProps: DataGridClasses &
    Pick<
      DataGridProps<T, D>,
      "renderHeaderContent" | "wrapBodyRow" | "wrapBodyContent"
    >;
  /** The search's columns, with the selection column prepended when there is one. */
  columns: ColumnDef<T, D>[];
  /** Part classes, for building custom cells that still look like Fluent's. */
  parts: FluentDataGridParts;
}

/**
 * Must be called inside a `FluentProvider`, so the theme's token custom
 * properties are in scope.
 */
export function useFluentDataGrid<T, D = unknown>(
  search: GridSearch<T, D>,
  options: UseFluentDataGridOptions<T, D> = {},
): FluentDataGridBundle<T, D> {
  const {
    selection,
    selectionColumn,
    rowKey,
    size,
    defaultColumnTemplate,
    ...headerOptions
  } = options;
  const { gridClasses, parts } = useFluentDataGridStyles({
    size,
    defaultColumnTemplate,
  });

  const getRow = search.data.rowProps.getBodyRow;

  // Not memoised: `selection` is rebuilt every render by design (it reads
  // `.value`), so a memo keyed on it would never hit. Prepending one column is
  // cheaper than the bookkeeping needed to avoid it.
  const columns = selection
    ? ([
        ...columnDefinitions<T, D>(
          fluentSelectionColumn(
            selection,
            parts,
            selectionColumn,
          ) as ColumnDefInit<T, D>,
        ),
        ...search.columns,
      ] as ColumnDef<T, D>[])
    : search.columns;

  return {
    gridProps: {
      ...gridClasses,
      renderHeaderContent: fluentHeaderContent(search, parts, headerOptions),
      wrapBodyRow: fluentRowWrapper<T>({ getRow, rowKey, selection }, parts),
      // Cell content is produced by a render callback, outside any component, so
      // a control read in there needs a component of its own to be reactive —
      // and this scopes the read to one cell instead of the whole grid.
      wrapBodyContent: (render) => <RenderControl render={render} />,
    },
    columns,
    parts,
  };
}
