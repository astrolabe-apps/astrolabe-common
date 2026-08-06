import React, { type ReactNode } from "react";
import { DataGrid, type DataGridClasses } from "@astroapps/datagrid";
import { pagerVisible, type GridSearch } from "@astroapps/datagrid-search";
import {
  useAriaDataGrid,
  type UseAriaDataGridOptions,
} from "./useAriaDataGrid";
import { AriaPager } from "./Pager";
import { resolveIcons } from "./icons";

export interface AriaDataGridProps<T, D = unknown>
  extends UseAriaDataGridOptions<T, D>, Partial<DataGridClasses> {
  search: GridSearch<T, D>;
  /** Shown in-grid when there are no rows and nothing is loading. */
  noData?: ReactNode;
  /**
   * Paging UI. `true`/omitted renders the built-in pager when there's more than
   * one page's worth, or whenever `pageSizes` is given; `false` suppresses it; a
   * node replaces it.
   */
  pager?: boolean | ReactNode;
  /**
   * Offer a page-size selector on the built-in pager. Supplying this also keeps
   * the pager rendered on a single page, so a size that fits everything can be
   * changed back.
   */
  pageSizes?: number[];
}

/**
 * A tailwind-styled grid over a `GridSearch`.
 *
 * Everything it renders follows from the search: sort arrows appear for columns
 * with a `sortField`, funnels for columns whose filter options resolve, and the
 * pager only when there's more than one page (or `pageSizes` is offered). A grid
 * with none of those renders as a plain table.
 *
 * Client-side or server-side is decided by which hook produced `search.data`, and
 * makes no difference here.
 *
 * Needs the astrolabe tailwind preset for its colours, and the package listed in
 * the consuming app's tailwind `content` — see the README.
 */
export function AriaDataGrid<T, D = unknown>(props: AriaDataGridProps<T, D>) {
  const {
    search,
    noData = "No data",
    pager = true,
    pageSizes,
    // DataGridClasses overrides are pulled out so they can win over the defaults
    // rather than being passed to the class builder.
    className,
    headerCellClass,
    lastRowClass,
    lastColumnClass,
    cellClass,
    bodyCellClass,
    defaultColumnTemplate,
    ...gridOptions
  } = props;
  const icons = resolveIcons(props.icons);
  const bundle = useAriaDataGrid(search, {
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
        {...bundle.gridProps}
        {...classOverrides}
        columns={bundle.columns}
        bodyRows={data.rowProps.bodyRows}
        getBodyRow={data.rowProps.getBodyRow}
        renderExtraRows={(rowNum) =>
          data.rowProps.bodyRows === 0 ? (
            <div
              key="__empty"
              style={{ gridRow: rowNum, gridColumn: "1 / -1" }}
              className={bundle.parts.message}
            >
              {data.loading ? (
                <>{icons.loading} Loading</>
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
    if (!pagerVisible(state.value, data, { pageSizes })) return null;
    return (
      <AriaPager
        state={state}
        data={data}
        pageSizes={pageSizes}
        parts={bundle.parts}
        icons={props.icons}
      />
    );
  }
}
