/**
 * Bundles this package's pieces into props for `@astroapps/datagrid`.
 *
 * Everything here is derived from a `GridSearch` — the composition holds no state
 * and makes no decisions about searching, which is what keeps the renderer
 * swappable. Same shape as `useFluentDataGrid`, so a composed grid can switch
 * renderers by changing one call.
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
import type { GridSearch, GridSelection } from "@astroapps/datagrid-search";
import {
  ariaDataGridClasses,
  type AriaDataGridParts,
  type AriaDataGridStyleOptions,
} from "./styles";
import {
  ariaSelectionColumn,
  type AriaSelectionColumnOptions,
} from "./selectionColumn";
import { ariaHeaderContent, type AriaHeaderContentOptions } from "./HeaderCell";
import { ariaRowWrapper } from "./rows";

export interface UseAriaDataGridOptions<T, D = unknown>
  extends AriaDataGridStyleOptions, AriaHeaderContentOptions<T, D> {
  /** Adds a leading checkbox column and paints selected rows. */
  selection?: GridSelection<T>;
  selectionColumn?: AriaSelectionColumnOptions;
  /** See `AriaRowWrapperOptions.selectOnRowClick`. Defaults to true. */
  selectOnRowClick?: boolean;
  /** Row keys, so React reorders rather than rebuilds on sort. */
  rowKey?: (row: T, index: number) => Key;
}

export interface AriaDataGridBundle<T, D = unknown> {
  /** Spread onto `<DataGrid>`: classes, header content, row and cell wrappers. */
  gridProps: DataGridClasses &
    Pick<
      DataGridProps<T, D>,
      "renderHeaderContent" | "wrapBodyRow" | "wrapBodyContent"
    >;
  /** The search's columns, with the selection column prepended when there is one. */
  columns: ColumnDef<T, D>[];
  /** Part classes, for building custom cells that match the rest of the grid. */
  parts: AriaDataGridParts;
}

/**
 * Not a hook in any meaningful sense — it calls none — but named `use*` to match
 * `useFluentDataGrid`, which has to be one.
 */
export function useAriaDataGrid<T, D = unknown>(
  search: GridSearch<T, D>,
  options: UseAriaDataGridOptions<T, D> = {},
): AriaDataGridBundle<T, D> {
  const {
    selection,
    selectionColumn,
    selectOnRowClick,
    rowKey,
    size,
    defaultColumnTemplate,
    classes,
    ...headerOptions
  } = options;
  const { gridClasses, parts } = ariaDataGridClasses({
    size,
    defaultColumnTemplate,
    classes,
  });

  const getRow = search.data.rowProps.getBodyRow;

  // Not memoised: `selection` is rebuilt every render by design (it reads
  // `.value`), so a memo keyed on it would never hit. Prepending one column is
  // cheaper than the bookkeeping needed to avoid it.
  const columns = selection
    ? ([
        ...columnDefinitions<T, D>(
          ariaSelectionColumn(
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
      renderHeaderContent: ariaHeaderContent(search, parts, headerOptions),
      wrapBodyRow: ariaRowWrapper<T>(
        { getRow, rowKey, selection, selectOnRowClick },
        parts,
      ),
      // Cell content is produced by a render callback, outside any component, so
      // a control read in there needs a component of its own to be reactive —
      // and this scopes the read to one cell instead of the whole grid.
      wrapBodyContent: (render) => <RenderControl render={render} />,
    },
    columns,
    parts,
  };
}
