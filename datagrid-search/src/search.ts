/**
 * The package's entry point: state + columns + a `GridData` in, everything a
 * renderer needs out.
 *
 * `data` arrives prebuilt rather than being fetched here, which is what keeps the
 * client/server choice a visible line at the call site:
 *
 * ```tsx
 * const data   = useClientData(state, { rows, columns });  // or makeGridData(query)
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
import { hasFilterOptions, useFilterOptions } from "./useFilterOptions";

export interface GridSearchOptions<T, D = unknown> {
  columns: ColumnDef<T, D>[];
  /** From `useClientData` or `makeGridData` (a react-query result, say). */
  data: GridData<T>;
  /**
   * How each column filters. **Must be pure** — see `GetColumnFilter`. Pass the
   * same function to `useClientData`, so both agree on fields and predicates.
   */
  getColumnFilter?: GetColumnFilter<T, D>;
  sort?: SortOptions;
  maxFilterOptions?: number;
  /**
   * Filter popups hold their selection until Apply, instead of searching on every
   * checkbox. Applying closes the popup; closing any other way discards.
   *
   * Worth it against a server, where an immediate filter means a request per
   * click — three values ticked is three searches, two of them already stale.
   *
   * Grid-wide on purpose: which click searches shouldn't vary between one funnel
   * and the next. A `ColumnFilter.render` of your own is the exception, and
   * unavoidably so — it gets `selected` and `close`, so when a selection is final
   * is whatever it decides.
   */
  deferApply?: boolean;
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

export function useGridSearch<
  T,
  D = unknown,
  S extends SearchOptions = SearchOptions,
>(state: Control<S>, options: GridSearchOptions<T, D>): GridSearch<T, D> {
  const {
    columns,
    data,
    getColumnFilter,
    sort: sortOptions,
    maxFilterOptions,
    deferApply,
  } = options;

  // The one thing worth memoising: `getColumnFilter` is called per column, and a
  // fresh `options` array per call would break memo deps downstream — worst case
  // a refetch loop against an async source.
  const filterFor = useMemo(
    () => columnFilterResolver(columns, getColumnFilter),
    [columns, getColumnFilter],
  );

  // Built fresh every render on purpose — neither is memoised.
  const sort = makeGridSort(state, sortOptions);
  const filter = makeGridFilter<T, D, S>(state, { filterFor, deferApply });

  return {
    // `S` extends SearchOptions and nothing here writes a whole value — sort,
    // filter and the pager all set individual fields — so a renderer that only
    // knows about SearchOptions can drive it safely. The cast keeps GridSearch to
    // two type parameters instead of leaking `S` into every renderer's props.
    state: state as unknown as Control<SearchOptions>,
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
        state: state as unknown as Control<SearchOptions>,
        maxFilterOptions,
      }),
  };
}
