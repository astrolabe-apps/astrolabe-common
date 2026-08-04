/**
 * The package's entry point: state + columns + a `GridData` in, everything a
 * renderer needs out.
 *
 * `data` arrives prebuilt rather than being fetched here, which is what keeps the
 * client/server choice a visible line at the call site:
 *
 * ```tsx
 * const data   = useClientData(state, { rows, columns });     // or useServerData
 * const search = useGridSearch(state, { columns, data });
 * ```
 */
import { useMemo } from "react";
import type { Control } from "@react-typed-forms/core";
import type { ColumnDef } from "@astroapps/datagrid";
import type { SearchOptions } from "@astroapps/searchstate";
import type { GridData } from "./types";
import { makeGridSort, type GridSort, type SortOptions } from "./sort";
import {
  columnFilterResolver,
  makeGridFilter,
  type ColumnFilter,
  type GetColumnFilter,
  type GridFilter,
} from "./filter";
import type { FilterOptions } from "./options";
import {
  hasFilterOptions,
  useFilterOptions,
  useFilterOptionsCache,
} from "./useFilterOptions";

export interface GridSearchOptions<T, D = unknown> {
  columns: ColumnDef<T, D>[];
  /** From `useClientData`, `useServerData`, or `makeGridData`. */
  data: GridData<T>;
  /**
   * How each column filters. **Must be pure** — see `GetColumnFilter`. Pass the
   * same function to `useClientData`, so both agree on fields and predicates.
   */
  getColumnFilter?: GetColumnFilter<T, D>;
  sort?: SortOptions;
  /** Zero `offset` when sort or filters change. Defaults to true. */
  resetPaging?: boolean;
  maxFilterOptions?: number;
}

export interface GridSearch<T, D = unknown> {
  state: Control<SearchOptions>;
  columns: ColumnDef<T, D>[];
  sort: GridSort;
  filter: GridFilter<T, D>;
  data: GridData<T>;
  /** This column's filter config, resolved once per column per columns change. */
  filterFor(column: ColumnDef<T, D>): ColumnFilter<T> | undefined;
  /** Whether to render a filter control at all — no source means no funnel. */
  canFilter(column: ColumnDef<T, D>): boolean;
  /**
   * A column's options. **Call from inside the popup surface**, so the request is
   * made when the popover opens rather than on every header render.
   */
  useFilterOptions(column: ColumnDef<T, D>): FilterOptions;
}

export function useGridSearch<T, D = unknown>(
  state: Control<SearchOptions>,
  options: GridSearchOptions<T, D>,
): GridSearch<T, D> {
  const {
    columns,
    data,
    getColumnFilter,
    sort: sortOptions,
    resetPaging = true,
    maxFilterOptions,
  } = options;

  // The one thing worth memoising: `getColumnFilter` is called per column, and a
  // fresh `options` array per call would break memo deps downstream — worst case
  // a refetch loop against an async source.
  const filterFor = useMemo(
    () => columnFilterResolver(columns, getColumnFilter),
    [columns, getColumnFilter],
  );

  const cache = useFilterOptionsCache();

  // Built fresh every render on purpose: both read `.value`, which is what
  // registers the dependency so the header re-renders when the search changes.
  const sort = makeGridSort(state, { ...sortOptions, resetPaging });
  const filter = makeGridFilter<T, D>(state, { filterFor, resetPaging });

  return {
    state,
    columns,
    sort,
    filter,
    data,
    filterFor,
    canFilter: (column) => hasFilterOptions(column, filterFor(column), data),
    useFilterOptions: (column) =>
      // eslint-disable-next-line react-hooks/rules-of-hooks -- called by the
      // popup component that owns it, not from this closure.
      useFilterOptions<T, D>({
        column,
        filter: filterFor(column),
        data,
        state,
        cache,
        maxFilterOptions,
      }),
  };
}
