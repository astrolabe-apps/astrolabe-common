import React, { type ReactNode } from "react";
import {
  Spinner,
  makeStyles,
  tokens,
  typographyStyles,
} from "@fluentui/react-components";
import { DataGrid, type DataGridClasses } from "@astroapps/datagrid";
import { pageInfo, type GridSearch } from "@astroapps/datagrid-search";
import {
  useFluentDataGrid,
  type UseFluentDataGridOptions,
} from "./useFluentDataGrid";
import { FluentPager } from "./Pager";

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

export interface FluentDataGridProps<T, D = unknown>
  extends UseFluentDataGridOptions<T, D>, Partial<DataGridClasses> {
  search: GridSearch<T, D>;
  /** Shown in-grid when there are no rows and nothing is loading. */
  noData?: ReactNode;
  /**
   * Paging UI. `true`/omitted renders the built-in pager when there's more than
   * one page's worth; `false` suppresses it; a node replaces it.
   */
  pager?: boolean | ReactNode;
  /** Offer a page-size selector on the built-in pager. */
  pageSizes?: number[];
}

/**
 * A Fluent v9-styled grid over a `GridSearch`.
 *
 * Everything it renders follows from the search: sort arrows appear for columns
 * with a `sortField`, funnels for columns whose filter options resolve, and the
 * pager only when there's more than one page. A grid with none of those renders as
 * a plain table.
 *
 * Client-side or server-side is decided by which hook produced `search.data`, and
 * makes no difference here.
 *
 * Must be rendered inside a `FluentProvider`.
 */
export function FluentDataGrid<T, D = unknown>(
  props: FluentDataGridProps<T, D>,
) {
  const {
    search,
    noData = "No data",
    pager = true,
    pageSizes,
    // DataGridClasses overrides are pulled out so they can win over the Fluent
    // defaults rather than being passed to the styles hook.
    className,
    headerCellClass,
    lastRowClass,
    lastColumnClass,
    cellClass,
    bodyCellClass,
    defaultColumnTemplate,
    ...gridOptions
  } = props;
  const styles = useStyles();
  const fluent = useFluentDataGrid(search, {
    ...gridOptions,
    defaultColumnTemplate,
  });
  const { data, state } = search;
  const classOverrides: Partial<DataGridClasses> = {
    ...(className !== undefined && { className }),
    ...(headerCellClass !== undefined && { headerCellClass }),
    ...(lastRowClass !== undefined && { lastRowClass }),
    ...(lastColumnClass !== undefined && { lastColumnClass }),
    ...(cellClass !== undefined && { cellClass }),
    ...(bodyCellClass !== undefined && { bodyCellClass }),
  };

  return (
    <>
      <DataGrid<T, D>
        {...fluent.gridProps}
        {...classOverrides}
        columns={fluent.columns}
        bodyRows={data.rowProps.bodyRows}
        getBodyRow={data.rowProps.getBodyRow}
        renderExtraRows={(rowNum) =>
          data.rowProps.bodyRows === 0 ? (
            <div
              key="__empty"
              style={{ gridRow: rowNum, gridColumn: "1 / -1" }}
              className={styles.message}
            >
              {data.loading ? (
                <>
                  <Spinner size="tiny" /> Loading
                </>
              ) : data.error ? (
                "Couldn't load data"
              ) : (
                noData
              )}
            </div>
          ) : (
            <></>
          )
        }
      />
      {renderPager()}
    </>
  );

  function renderPager() {
    if (pager === false) return null;
    if (pager !== true) return pager;
    // Nothing to page through: on the first page with no further one. Works for
    // an uncounted source too, where `hasMore` is inferred from a full page.
    const { hasPrevious, hasMore } = pageInfo(state.value, data);
    if (!hasPrevious && !hasMore) return null;
    return <FluentPager state={state} data={data} pageSizes={pageSizes} />;
  }
}
