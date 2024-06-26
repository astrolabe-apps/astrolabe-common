import React, {
  CSSProperties,
  Key,
  ReactElement,
  ReactNode,
  useMemo,
} from "react";
import clsx from "clsx";
import {
  ColumnDef,
  getColumnTemplate,
  getContainerStyles,
  isColumnGroup,
  maxHeaderRowsForCols,
  renderBodyCells,
  renderHeaderCells,
  RenderHeaderRowProps,
  RenderRowProps,
} from "./columns";

export interface DataGridClasses {
  className?: string;
  headerCellClass?: string;
  lastRowClass?: string;
  lastColumnClass?: string;
  cellClass?: string;
  bodyCellClass?: string;
  defaultColumnTemplate?: string;
}

export const defaultTableClasses: DataGridClasses = {
  headerCellClass: "font-bold",
  cellClass: "px-1",
  bodyCellClass: "border-t py-1 flex items-center",
};

export interface DataGridProps<T, D = unknown> extends DataGridClasses {
  columns: ColumnDef<T, D>[];
  extraHeaderRows?: ReactElement[];
  wrapBodyContent?: (render: () => ReactNode) => ReactNode;
  renderHeaderContent?: (col: ColumnDef<T, D>) => ReactNode;
  renderExtraRows?: (rowNum: number) => ReactElement;
  wrapBodyRow?: (
    rowIndex: number,
    render: (rowData: T, key: Key) => ReactNode,
  ) => ReactNode;
  wrapHeaderRow?: (
    headerRowIndex: number,
    render: () => ReactNode,
  ) => ReactNode;
  style?: CSSProperties;
}

export function DataGrid<T, D = unknown>(
  props: DataGridProps<T, D> & {
    bodyRows: number;
    getBodyRow(index: number): T;
  },
): ReactElement;

export function DataGrid<T, D = unknown>(
  props: DataGridProps<T, D> & {
    rows: T[];
  },
): ReactElement;

export function DataGrid<T, D = unknown>(
  props: DataGridProps<T, D> & {
    bodyRows?: number;
    getBodyRow?: (index: number) => T;
    rows?: T[];
  },
) {
  const {
    style,
    className,
    headerCellClass,
    lastColumnClass,
    cellClass,
    bodyCellClass,
    columns,
    wrapHeaderRow,
    defaultColumnTemplate = "auto",
    bodyRows: rowCount,
    getBodyRow: gbr,
    lastRowClass,
    renderHeaderContent,
    wrapBodyContent,
    extraHeaderRows = [],
    renderExtraRows,
    wrapBodyRow,
    rows,
  } = { ...defaultTableClasses, ...props };

  const getBodyRow = gbr ? gbr : (i: number) => rows![i];
  const bodyRows = rowCount !== undefined ? rowCount : rows!.length;

  const visibleColumns = useMemo(
    () => columns.filter((c) => !c.hidden),
    [columns],
  );
  const lastColIndex = visibleColumns.length - 1;
  const totalHeaderRows = maxHeaderRowsForCols(visibleColumns, 1);
  const headerOffset = extraHeaderRows.length + 1;
  const headerCells = Array.from({ length: totalHeaderRows }).flatMap(
    (_, rowIndex) => {
      const doRender = () => {
        const rowProps: RenderHeaderRowProps<T, D> = {
          totalRows: totalHeaderRows,
          rowIndex,
          makeClassName: makeHeaderClass,
          gridRowOffset: headerOffset,
          headerContents: renderHeaderContent ?? ((c) => c.title),
        };
        return visibleColumns.flatMap((c, cIndex) =>
          renderHeaderCells(rowProps, c, cIndex === lastColIndex),
        );
      };
      return wrapHeaderRow?.(rowIndex, doRender) ?? doRender();
    },
  );
  const gridTemplateColumns = getColumnTemplate(
    visibleColumns,
    defaultColumnTemplate,
  );

  const containerStyles = getContainerStyles(visibleColumns);

  const bodyRowOffset = headerOffset + totalHeaderRows;
  const cells = Array.from({ length: bodyRows }).flatMap((_, rowIndex) => {
    const doRender = (row: T, rowKey: Key) => {
      const rowProps: RenderRowProps<T> = {
        row,
        rowIndex,
        makeClassName: makeBodyClass,
        gridRowOffset: bodyRowOffset,
        wrap: wrapBodyContent,
        totalRows: bodyRows,
        rowKey,
      };
      return visibleColumns.flatMap((c, cIndex) =>
        renderBodyCells(rowProps, c, cIndex === lastColIndex),
      );
    };
    return (
      wrapBodyRow?.(rowIndex, doRender) ??
      doRender(getBodyRow(rowIndex), rowIndex)
    );
  });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns,
        ...containerStyles,
        ...style,
      }}
      className={className}
    >
      {extraHeaderRows}
      {headerCells}
      {cells}
      {renderExtraRows?.(bodyRowOffset + bodyRows)}
    </div>
  );

  function makeBodyClass(
    column: ColumnDef<T>,
    lastRow: boolean,
    lastColumn: boolean,
  ) {
    if (isColumnGroup(column))
      return clsx(column.bodyCellClass, column.cellClass);
    return clsx(
      column.bodyCellClass,
      column.cellClass,
      bodyCellClass,
      cellClass,
      lastRow && lastRowClass,
      lastColumn && lastColumnClass,
    );
  }

  function makeHeaderClass(column: ColumnDef<T>, lastColumn: boolean) {
    if (isColumnGroup(column))
      return clsx(column.headerCellClass, column.cellClass);
    return clsx(
      column.headerCellClass,
      column.cellClass,
      headerCellClass,
      cellClass,
      lastColumn && lastColumnClass,
    );
  }
}
