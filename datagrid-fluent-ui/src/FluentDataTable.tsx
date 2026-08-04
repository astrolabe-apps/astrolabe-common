import React, { useEffect, useMemo } from "react";
import { type Control, useControl } from "@react-typed-forms/core";
import {
  type ColumnDef,
  columnFilterValues,
  columnSearching,
} from "@astroapps/datagrid";
import {
  defaultSearchOptions,
  makeClientSortAndFilter,
  type SearchOptions,
} from "@astroapps/searchstate";
import {
  FluentDataTableView,
  type FluentDataTableViewProps,
} from "./FluentDataTableView";

export interface FluentDataTableProps<T, D = unknown> extends Omit<
  FluentDataTableViewProps<T, D>,
  "state" | "pageRows" | "getRow" | "useFilterValues"
> {
  data: T[];
  /** Supply to share/persist the search state; otherwise one is created here. */
  state?: Control<SearchOptions>;
  initialSort?: string[];
  /** Slice the data to `offset`/`length`. Off by default — there's no pager. */
  paged?: boolean;
  pageSize?: number;
  /** Receives the filtered row count, for driving your own pager. */
  totalRows?: Control<number>;
  maxFilterValues?: number;
}

/**
 * Client-side sorting and filtering over an in-memory array, the Fluent
 * counterpart of `astrolabe-ui`'s `DataTable`. All of the work is
 * `@astroapps/searchstate`'s — `columnSearching` just turns the columns into the
 * accessors it wants.
 */
export function FluentDataTable<T, D = unknown>({
  data,
  state: externalState,
  initialSort,
  paged,
  pageSize = 10,
  totalRows,
  maxFilterValues,
  ...viewProps
}: FluentDataTableProps<T, D>) {
  const internalState = useControl<SearchOptions>({
    ...defaultSearchOptions,
    length: pageSize,
    sort: initialSort ?? [],
  });
  const state = externalState ?? internalState;
  const { columns } = viewProps;

  const searchOptions = state.value;
  const filtered = useMemo(
    () =>
      makeClientSortAndFilter(columnSearching(columns))(searchOptions, data),
    [
      data,
      columns,
      searchOptions.query,
      searchOptions.sort,
      searchOptions.filters,
    ],
  );

  const pageData = paged
    ? filtered.slice(
        searchOptions.offset,
        searchOptions.offset + searchOptions.length,
      )
    : filtered;

  useEffect(() => {
    if (totalRows) totalRows.value = filtered.length;
  }, [filtered.length]);

  const useFilterValues = (field: string) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable per column
    useMemo(
      () => columnFilterValues(columns, data, field, maxFilterValues),
      [data, columns, field],
    );

  return (
    <FluentDataTableView<T, D>
      {...viewProps}
      state={state}
      pageRows={pageData.length}
      getRow={(i) => pageData[i]}
      useFilterValues={useFilterValues}
    />
  );
}
