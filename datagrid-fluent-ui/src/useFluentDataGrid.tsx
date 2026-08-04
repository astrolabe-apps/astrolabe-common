import type { Key } from "react";
import type {
  ColumnDef,
  ColumnDefInit,
  DataGridClasses,
  DataGridProps,
} from "@astroapps/datagrid";
import {
  useFluentDataGridStyles,
  type FluentDataGridParts,
  type FluentDataGridStyleOptions,
} from "./styles";
import {
  fluentSelectionColumn,
  type FluentSelection,
  type FluentSelectionColumnOptions,
} from "./selection";
import {
  fluentHeaderContent,
  type FluentHeaderContentOptions,
  type FluentSort,
} from "./sorting";
import { fluentRowWrapper } from "./rows";

export interface UseFluentDataGridOptions<
  T,
> extends FluentDataGridStyleOptions {
  rows?: T[];
  /** Alternative to `rows`, for virtualised/lazy grids. */
  getRow?: (index: number) => T;
  rowKey?: (row: T, index: number) => Key;
  sort?: FluentSort;
  selection?: FluentSelection<T>;
  selectionColumn?: FluentSelectionColumnOptions;
  header?: FluentHeaderContentOptions;
}

export interface FluentDataGrid<T> {
  /** Spread onto `<DataGrid>`: classes, header content and the row wrapper. */
  gridProps: DataGridClasses &
    Pick<DataGridProps<T, any>, "renderHeaderContent" | "wrapBodyRow">;
  /** Leading checkbox column, present only when `selection` was given. */
  selectionColumn?: ColumnDefInit<T>;
  /** Part classes, for building custom cells that still look like Fluent's. */
  parts: FluentDataGridParts;
  /** Client-side sort using the current sort state; identity when unsorted. */
  sortRows(rows: T[], columns: ColumnDef<T, any>[]): T[];
}

/**
 * Bundles the pieces of this package into props for `@astroapps/datagrid`, so
 * a Fluent-looking grid is a hook call plus a `columns` array:
 *
 * ```tsx
 * const fluent = useFluentDataGrid({ rows, size, sort, selection });
 * const columns = columnDefinitions<Row>(fluent.selectionColumn!, ...myColumns);
 * <DataGrid {...fluent.gridProps} rows={fluent.sortRows(rows, columns)} columns={columns} />
 * ```
 *
 * Each piece is also exported on its own (`useFluentDataGridStyles`,
 * `fluentSelectionColumn`, `fluentHeaderContent`, `fluentRowWrapper`) for grids
 * that need to compose them differently.
 *
 * Must be called inside a `FluentProvider`.
 */
export function useFluentDataGrid<T>(
  options: UseFluentDataGridOptions<T> = {},
): FluentDataGrid<T> {
  const {
    rows,
    getRow,
    rowKey,
    sort,
    selection,
    selectionColumn,
    header,
    ...styleOptions
  } = options;
  const { gridClasses, parts } = useFluentDataGridStyles(styleOptions);
  const canWrapRows = !!rows || !!getRow;
  return {
    gridProps: {
      ...gridClasses,
      renderHeaderContent: fluentHeaderContent(sort, parts, header),
      // Without a way to get a row there's nothing to paint hover/selection
      // against, so leave rows unwrapped rather than guess.
      wrapBodyRow: canWrapRows
        ? fluentRowWrapper<T>({ rows, getRow, rowKey, selection }, parts)
        : undefined,
    },
    selectionColumn: selection
      ? fluentSelectionColumn(selection, parts, selectionColumn)
      : undefined,
    parts,
    sortRows: (r, columns) => (sort ? sort.sortRows(r, columns) : r),
  };
}
