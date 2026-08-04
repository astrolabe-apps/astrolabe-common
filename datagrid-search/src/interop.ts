/**
 * Adapters for driving a grid from something other than this package's own
 * fetching hooks — react-query being the case that matters.
 *
 * `GridData` and `FilterOptions` are plain interfaces, so the interop is just
 * "build one". These factories exist so callers don't hand-roll `rowProps` or
 * forget that `facets` feed the filter options.
 *
 * Deliberately *not* a structural `QueryLike` type that a `UseQueryResult`
 * satisfies: that would couple us to react-query's flag names across versions
 * (v4's `isLoading` became v5's `isPending`) and would have to guess which flag
 * the caller means — `isFetching` and `isPending` differ exactly when
 * `keepPrevious` matters. A one-line explicit mapping is shorter than the docs
 * explaining the guess.
 */
import { useEffect, useMemo, useState } from "react";
import type { Control } from "@react-typed-forms/core";
import type { SearchOptions } from "@astroapps/searchstate";
import type { FilterOption, GridData, GridPage } from "./types";
import type { FilterOptions } from "./options";

export interface MakeGridDataOptions<T> {
  /** The fetched page, or undefined while there isn't one yet. */
  page: GridPage<T> | undefined;
  loading?: boolean;
  error?: unknown;
  reload?: () => void;
}

/**
 * A `GridData` from a fetched page.
 *
 * ```tsx
 * const q = useQuery({ queryKey: ["files", options], queryFn: ... });
 * const data = makeGridData({
 *   page: q.data, loading: q.isFetching, error: q.error, reload: q.refetch,
 * });
 * ```
 */
export function makeGridData<T>(o: MakeGridDataOptions<T>): GridData<T> {
  const { page, loading = false, error, reload } = o;
  const rows = page?.rows ?? [];
  return {
    rows,
    total: page?.total ?? 0,
    loading,
    error,
    reload: reload ?? (() => {}),
    rowProps: { bodyRows: rows.length, getBodyRow: (i) => rows[i] },
    facets: page?.facets,
  };
}

export interface MakeFilterOptionsArgs {
  options: FilterOption[] | undefined;
  loading?: boolean;
  error?: unknown;
  reload?: () => void;
}

/** A `FilterOptions` from a query result, for a `{ hook }` option source. */
export function makeFilterOptions(o: MakeFilterOptionsArgs): FilterOptions {
  return {
    options: o.options ?? [],
    loading: o.loading ?? false,
    error: o.error,
    reload: o.reload ?? (() => {}),
  };
}

/**
 * `SearchOptions` with only `query` debounced — sort, filter and paging changes
 * pass through immediately.
 *
 * This is the piece react-query doesn't have: it can dedupe and cache a key, but
 * it has no notion of "settle the text field before letting it into the key". The
 * result is a plain object, so it works directly as a query key.
 *
 * Reads the state's fields during render, so control tracking re-renders the
 * caller when the search changes.
 */
export function useDebouncedSearchOptions(
  state: Control<SearchOptions>,
  ms = 300,
): SearchOptions {
  // Read per field rather than `state.value`: each is referentially stable until
  // it actually changes, which is what makes the memo dependencies below
  // meaningful. `@react-typed-forms/transform` (see .babelrc) makes these reads
  // tracked, so a change re-renders the caller.
  const fields = state.fields;
  const query = fields.query.value;
  const sort = fields.sort.value;
  const filters = fields.filters.value;
  const offset = fields.offset.value;
  const length = fields.length.value;

  const [settledQuery, setSettledQuery] = useState(query);

  useEffect(() => {
    if (settledQuery === query) return;
    if (ms <= 0) {
      setSettledQuery(query);
      return;
    }
    const timer = setTimeout(() => setSettledQuery(query), ms);
    // Typing again before the timer fires cancels it, so a burst of keystrokes
    // settles once rather than per character.
    return () => clearTimeout(timer);
    // settledQuery is deliberately absent: including it would restart the timer
    // when it lands, and the comparison above already guards the no-op case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, ms]);

  return useMemo(
    () => ({ query: settledQuery, sort, filters, offset, length }),
    [settledQuery, sort, filters, offset, length],
  );
}
