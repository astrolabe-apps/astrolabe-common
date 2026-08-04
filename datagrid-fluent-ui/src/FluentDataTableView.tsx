import React, { type Key, type ReactNode } from "react";
import {
  Spinner,
  makeStyles,
  tokens,
  typographyStyles,
} from "@fluentui/react-components";
import { type Control, RenderControl } from "@react-typed-forms/core";
import {
  type ColumnDef,
  DataGrid,
  type DataGridClasses,
  columnDefinitions,
} from "@astroapps/datagrid";
import type { SearchOptions } from "@astroapps/searchstate";
import {
  useFluentDataGrid,
  type UseFluentDataGridOptions,
} from "./useFluentDataGrid";
import { controlSearchStateSort } from "./controls";
import { FluentFilterPopover } from "./FluentFilterPopover";
import type {
  FluentSelection,
  FluentSelectionColumnOptions,
} from "./selection";
import type { FluentDataGridSize } from "./styles";

const useStyles = makeStyles({
  message: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingVerticalXXL,
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground3,
  },
});

export interface FluentDataTableViewProps<
  T,
  D = unknown,
> extends Partial<DataGridClasses> {
  /** Query/sort/filters/paging state, as held by a search page. */
  state: Control<SearchOptions>;
  columns: ColumnDef<T, D>[];
  /** Number of rows on the current page. */
  pageRows: number;
  getRow(index: number): T;
  rowId?: (row: T, index: number) => Key;
  /**
   * Distinct `[value, label]` filter options for a `filterField`. Columns with a
   * `filterField` only get a filter control when this is supplied.
   */
  useFilterValues?: (field: string) => [string, string][];
  loading?: boolean;
  noData?: ReactNode;
  size?: FluentDataGridSize;
  selection?: FluentSelection<T>;
  selectionColumn?: FluentSelectionColumnOptions;
  /** Keep secondary sorts. Off by default, matching Fluent's 1-column look. */
  multipleSort?: boolean;
  /**
   * Include `rotateSort`'s third "unsorted" step. Off by default, so header
   * clicks flip ascending ↔ descending like Fluent's own DataGrid.
   */
  cycleUnsorted?: boolean;
  /** Reset `offset` to 0 when sort or filters change. Defaults to true. */
  resetPaging?: boolean;
}

/**
 * A Fluent v9-styled table driven by `@astroapps/searchstate` state — the Fluent
 * counterpart of `astrolabe-ui`'s `DataTableView`. Header cells sort (via
 * `rotateSort`) and filter, cell content is scoped so control reads don't
 * re-render the whole grid, and empty/loading states are rendered in-grid.
 *
 * Paging state (`offset`/`length`) is respected by whoever produces `getRow`;
 * this component renders no pager.
 *
 * Must be rendered inside a `FluentProvider`.
 */
export function FluentDataTableView<T, D = unknown>(
  props: FluentDataTableViewProps<T, D>,
) {
  const {
    state,
    columns,
    pageRows,
    getRow,
    rowId,
    useFilterValues,
    loading,
    noData = "No data",
    size,
    selection,
    selectionColumn,
    multipleSort,
    cycleUnsorted,
    resetPaging = true,
    ...classOverrides
  } = props;
  const styles = useStyles();

  const sort = controlSearchStateSort(state, {
    multiple: multipleSort,
    resetPaging,
    cycleUnsorted,
  });

  const options: UseFluentDataGridOptions<T> = {
    size,
    getRow,
    rowKey: rowId,
    sort,
    selection,
    selectionColumn,
    header: { renderFilter },
  };
  const fluent = useFluentDataGrid<T>(options);

  const allColumns = fluent.selectionColumn
    ? ([
        ...columnDefinitions<T>(fluent.selectionColumn),
        ...columns,
      ] as ColumnDef<T, D>[])
    : columns;

  return (
    <DataGrid<T, D>
      {...fluent.gridProps}
      {...classOverrides}
      bodyRows={pageRows}
      getBodyRow={getRow}
      columns={allColumns}
      // Cell content lives in a render callback, outside any component, so a
      // control read in there needs its own component to be reactive — and it
      // scopes the read to one cell instead of the whole grid.
      wrapBodyContent={(render) => <RenderControl render={render} />}
      renderExtraRows={(rowNum) =>
        pageRows === 0 ? (
          <div
            key="__empty"
            style={{ gridRow: rowNum, gridColumn: "1 / -1" }}
            className={styles.message}
          >
            {loading ? (
              <>
                <Spinner size="tiny" /> Loading
              </>
            ) : (
              noData
            )}
          </div>
        ) : (
          <></>
        )
      }
    />
  );

  function renderFilter(column: ColumnDef<any, any>) {
    const filterField = column.filterField;
    if (!filterField || !useFilterValues) return null;
    return (
      <FluentFilterPopover
        filterField={filterField}
        filters={state.fields.filters}
        useFilterValues={useFilterValues}
        onFilterChanged={
          resetPaging ? () => (state.fields.offset.value = 0) : undefined
        }
      />
    );
  }
}
