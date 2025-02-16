import React, {
  CSSProperties,
  Fragment,
  Key,
  ReactElement,
  ReactNode,
} from "react";

export type Sortable = string | number | undefined | null | boolean | Date;

export type SortDirection = "asc" | "desc";

export interface ColumnHeader {
  id: string;
  title: string;
  columnTemplate?: string;
  columnContainerStyles?: CSSProperties;
  hidden?: boolean;
  filterField?: string;
  sortField?: string;
  defaultSort?: SortDirection;
  cellClass?: string;
  headerCellClass?: string;
  bodyCellClass?: string;
}

export type ColumnRenderer<T, D> = (
  row: T,
  rowIndex: number,
  col: ColumnDef<any, D>,
) => ReactNode;

export interface CellRenderProps<T, D = unknown> {
  key: Key;
  row: T;
  column: ColumnDef<any, D>;
  className: string;
  rowNum: number;
  rowSpan: number;
  lastColumn: boolean;
  children: ReactNode;
}

export interface ColumnRender<T, D> extends ColumnHeader {
  render: ColumnRenderer<T, D>;
  data?: D;
  renderBody?: (cell: CellRenderProps<T, D>) => ReactElement;
  renderHeader?: (cell: CellRenderProps<number, D>) => ReactElement;
}

export interface ColumnDef<T, D = unknown> extends ColumnRender<T, D> {
  compare?: (first: T, second: T) => number;
  getter?: (row: T) => Sortable;
  filterValue?: (row: T) => [string, string];
  children?: ColumnDef<T, D>[];
  getRowSpan?: (row: T, rowIndex: number) => number | [number, boolean];
  headerRowSpans?: number[];
}

export function isColumnGroup(c: ColumnDef<any>) {
  return !!c.children;
}

export interface RenderHeaderRowProps<T, D> {
  rowIndex: number;
  totalRows: number;
  gridRowOffset: number;
  makeClassName: (column: ColumnDef<T, D>, lastColumn: boolean) => string;
  headerContents: (column: ColumnDef<any, D>) => ReactNode;
}

export function renderHeaderCells<T, D>(
  headerRowProps: RenderHeaderRowProps<T, D>,
  column: ColumnDef<T, D>,
  lastColumn: boolean,
): ReactElement[] | ReactElement {
  const { rowIndex, gridRowOffset, totalRows, makeClassName } = headerRowProps;
  const rowSpan = column.headerRowSpans
    ? column.headerRowSpans[rowIndex] ?? 0
    : rowIndex === totalRows - 1
    ? 1
    : 0;
  if (rowSpan === 0) return [];
  const className = makeClassName(column, lastColumn);
  const rowNum = rowIndex + gridRowOffset;
  const children = column.children
    ? visibleChildren(column.children).flatMap((c, i, arr) =>
        renderHeaderCells(
          headerRowProps,
          c,
          lastColumn && i === arr.length - 1,
        ),
      )
    : headerRowProps.headerContents(column);
  return (column.renderHeader ?? defaultRenderCell)({
    row: rowIndex,
    rowNum,
    className,
    lastColumn,
    column,
    rowSpan,
    children,
    key: rowIndex + "_" + column.id,
  });
}

export interface RenderRowProps<T> {
  row: T;
  rowKey: Key;
  rowIndex: number;
  totalRows: number;
  gridRowOffset: number;
  makeClassName: (
    column: ColumnDef<T>,
    lastRow: boolean,
    lastColumn: boolean,
  ) => string;
  wrap?: (render: () => ReactNode) => ReactNode;
}

export function renderBodyCells<T>(
  rowProps: RenderRowProps<T>,
  column: ColumnDef<T>,
  lastColumn: boolean,
): ReactElement[] | ReactElement {
  const { row, rowKey, rowIndex, totalRows, makeClassName, gridRowOffset } =
    rowProps;
  const customSpan = column.getRowSpan?.(row, rowIndex);
  const [rowSpan, lastRow] = Array.isArray(customSpan)
    ? customSpan
    : ((span: number) => [span, rowIndex + span >= totalRows])(customSpan ?? 1);
  if (rowSpan === 0) return [];
  const className = makeClassName(column, lastRow, lastColumn);
  const rowNum = rowIndex + gridRowOffset;
  const doRender = () => column.render(row, rowIndex, column);
  const children = column.children
    ? visibleChildren(column.children).flatMap((c, i, arr) =>
        renderBodyCells(rowProps, c, lastColumn && i === arr.length - 1),
      )
    : rowProps.wrap?.(doRender) ?? doRender();
  return (column.renderBody ?? defaultRenderCell)({
    row,
    rowNum,
    className,
    lastColumn,
    column,
    rowSpan,
    children,
    key: rowKey + "_" + column.id,
  });
}

export function defaultRenderCell(
  {
    className,
    children,
    key,
    column,
    rowNum,
    rowSpan,
    forceCell,
  }: {
    column: ColumnDef<any, any>;
    className?: string;
    children: ReactNode;
    key: Key;
    rowNum: number;
    rowSpan: number;
    forceCell?: boolean;
  },
  style?: CSSProperties,
): ReactElement {
  if (!className && !forceCell && isColumnGroup(column))
    return <Fragment key={key}>{children}</Fragment>;
  const gridStyle = gridAreaStyles(column, rowNum, rowSpan, forceCell);
  return (
    <div key={key} style={{ ...style, ...gridStyle }} className={className}>
      {children}
    </div>
  );
}

export function visibleChildren<T, D>(
  c: ColumnDef<T, D>[],
): ColumnDef<any, D>[] {
  return c.filter((x) => !x.hidden);
}

export function gridAreaStyles(
  col: ColumnDef<any, any>,
  rowNum: number,
  rowSpan: number,
  forceCell?: boolean,
): CSSProperties {
  if (!forceCell && isColumnGroup(col)) return { display: "contents" };
  return {
    ...gridColumnStyle(col.id, col.id, true),
    gridRowStart: rowNum,
    gridRowEnd: "span " + rowSpan,
  };
}

export function gridColumnAreaStyles(
  colLineStart: string,
  colLineEnd: string,
  rowNum: number,
  rowSpan: number,
  inclusive?: boolean,
) {
  return {
    ...gridColumnStyle(colLineStart, colLineEnd, inclusive),
    gridRowStart: rowNum,
    gridRowEnd: "span " + rowSpan,
  };
}

export function gridColumnStyle(
  startCol: string,
  endCol: string,
  inclusive?: boolean,
): {
  gridColumnStart: string;
  gridColumnEnd: string;
} {
  return {
    gridColumnStart: getColumnLineName(startCol, true),
    gridColumnEnd: getColumnLineName(endCol, !inclusive),
  };
}

function getColumnLineName(id: string, start: boolean) {
  return `c${id.replaceAll(" ", "_")}_${start ? "s" : "e"}`;
}

export function getColumnTemplate(
  cols: ColumnDef<any, any>[],
  defaultColumnTemplate: string,
): string {
  const [columnTemplate, lines] = cols.reduce(
    (acc, c) => addColumnTemplate(c, defaultColumnTemplate, acc),
    ["", [] as string[]],
  );
  return columnTemplate + " " + writeLineNames(lines);
}

export function getContainerStyles(cols: ColumnDef<any, any>[]): CSSProperties {
  return cols.reduce((acc, c) => {
    const childStyles = c.children
      ? getContainerStyles(visibleChildren(c.children))
      : {};
    return mergeCss(mergeCss(acc, c.columnContainerStyles), childStyles);
  }, {} as CSSProperties);
}

function mergeCss(acc: CSSProperties, other?: CSSProperties) {
  if (other) {
    const overrideCounter =
      other.counterReset && acc.counterReset
        ? other.counterReset + " " + acc.counterReset
        : "";
    Object.assign(acc, other);
    if (overrideCounter) {
      acc.counterReset = overrideCounter;
    }
  }
  return acc;
}

function writeLineNames(names: string[]) {
  return "[" + names.join(" ") + "]";
}
function addColumnTemplate<T>(
  col: ColumnDef<T>,
  defaultColumnTemplate: string,
  [current, lineNames]: [string, string[]],
): [string, string[]] {
  if (col.children) {
    const [nextCurrent, nextLines] = visibleChildren(col.children).reduce(
      (acc, c) => addColumnTemplate(c, defaultColumnTemplate, acc),
      [current, [...lineNames, getColumnLineName(col.id, true)]],
    );
    return [nextCurrent, [...nextLines, getColumnLineName(col.id, false)]];
  }
  const templateString = col.columnTemplate ?? defaultColumnTemplate;
  return [
    current +
      " " +
      writeLineNames([...lineNames, getColumnLineName(col.id, true)]) +
      " " +
      templateString,
    [getColumnLineName(col.id, false)],
  ];
}

export function maxHeaderRowsForCols(
  cols: ColumnDef<any, any>[],
  current: number,
): number {
  return cols.reduce((a, n) => Math.max(a, maxHeaderRows(n)), current);
}

export function maxHeaderRows(c: ColumnDef<any, any>): number {
  const thisHeaders = c.headerRowSpans?.length ?? 1;
  return c.children
    ? maxHeaderRowsForCols(visibleChildren(c.children), thisHeaders)
    : thisHeaders;
}

export function mapColumn<T, T2, D>(
  col: ColumnDef<T, D>,
  map: (from: T2) => T,
  override?: Partial<ColumnDef<T2, D>>,
): ColumnDef<T2, D> {
  return {
    ...col,
    compare: col.compare ? (f, s) => col.compare!(map(f), map(s)) : undefined,
    getter: col.getter ? (r) => col.getter!(map(r)) : undefined,
    filterValue: col.filterValue ? (r) => col.filterValue!(map(r)) : undefined,
    children: col.children ? mapColumns(col.children, map) : undefined,
    renderBody: col.renderBody
      ? (props) => col.renderBody!({ ...props, row: map(props.row) })
      : undefined,
    ...override,
    render:
      override?.render ??
      ((row, rowIndex, c) => col.render(map(row), rowIndex, c)),
    getRowSpan:
      override?.getRowSpan ??
      (col.getRowSpan ? (r, ri) => col.getRowSpan!(map(r), ri) : undefined),
  };
}

export function mapColumns<T, T2, D>(
  cols: ColumnDef<T, D>[],
  map: (from: T2) => T,
  override?: (cd: ColumnDef<T, D>) => Partial<ColumnDef<T2, D>>,
): ColumnDef<T2, D>[] {
  return cols.map((x) => mapColumn(x, map, override?.(x)));
}
