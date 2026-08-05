/**
 * The server-side data source: react-query for the fetching (abort, stale-response
 * ordering, keep-previous, cross-component cache sharing), plus the one rule
 * react-query can't express on its own — **count once per search, not once per
 * page**.
 *
 * The count rides the page response (a `GridPage`'s `total`), and `includeTotal`
 * is handed to `search` as the request's "should I count?" flag — the client-side
 * twin of a server's `SearchHelper.includeTotal`. The total is cached on a key
 * that excludes `offset`/`length`/`sort`, so paging and sorting reuse it instead
 * of re-counting; a real search change is a new key, so it clears.
 *
 * `makeGridData` and `useDebouncedSearchRequest` (interop.ts) stay query-library
 * agnostic; this is the react-query binding built over them.
 */
import type { Control } from "@react-typed-forms/core";
import type { SearchRequest } from "@astroapps/searchstate";
import {
  keepPreviousData,
  skipToken,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { GridData, GridPage } from "./types";
import { makeGridData, useDebouncedSearchRequest } from "./interop";

export interface ServerDataOptions<T, S extends SearchRequest = SearchRequest> {
  /**
   * Stable cache-key prefix — `"cars"`, or `["cars", tenantId]`. The page and the
   * total are keyed under it; two grids sharing a prefix share cache.
   */
  queryKey: unknown[] | string;
  /**
   * Fetches one page. Receives the state's *whole* value, so a state that extends
   * `SearchRequest` with filtering of its own is carried through without wiring.
   *
   * `includeTotal` is the request's "should I count?" flag — true only when
   * there's no total for the current search yet. Return the count in the page's
   * `total` when asked (a `SearchResults`-style combined endpoint); or ignore it
   * and always count, which is fine for a cheap count but re-counts on every page.
   */
  search: (
    options: S,
    includeTotal: boolean,
    signal: AbortSignal,
  ) => Promise<GridPage<T>>;
  /** Debounce for `query` only. Defaults to 300ms; 0 disables it. */
  debounce?: number;
  /**
   * Count once per search. Defaults to true; false never asks for a total and
   * never reports one — including a total left in the cache by a grid that shares
   * the key prefix. A grid opts out because a total would be wrong or unwanted for
   * it, so borrowing another's would defeat the point.
   */
  count?: boolean;
  /** Keep the previous page visible while refetching. Defaults to true. */
  keepPrevious?: boolean;
}

export function useServerData<T, S extends SearchRequest = SearchRequest>(
  state: Control<S>,
  options: ServerDataOptions<T, S>,
): GridData<T> {
  const {
    queryKey,
    search,
    debounce = 300,
    count = true,
    keepPrevious = true,
  } = options;
  const prefix = Array.isArray(queryKey) ? queryKey : [queryKey];
  const client = useQueryClient();
  const searchRequest = useDebouncedSearchRequest(state, debounce);

  // "The search apart from paging and ordering": offset/length/sort can't change a
  // count, so they're excluded from the total's key. Written as an exclusion, so a
  // state extending SearchRequest is covered without naming its fields — and it's
  // what makes the count survive paging and re-run only on a real search change.
  const { offset, length, sort, ...identity } = searchRequest;
  const totalKey = [...prefix, "total", identity];

  const page = useQuery({
    queryKey: [...prefix, "page", searchRequest],
    queryFn: async ({ signal }) => {
      // Ask for the total only when we've none for this search. Store `null` for
      // "asked, none came" so a decline or failure isn't retried on every page.
      // `includeTotal` stays *out* of the page key — the rows for a given
      // (offset, filters, sort) are the same whether or not we counted.
      const haveTotal = !count || client.getQueryData(totalKey) !== undefined;
      const result = await search(searchRequest, !haveTotal, signal);
      if (count && !haveTotal)
        client.setQueryData(totalKey, result.total ?? null);
      return result;
    },
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });

  // A pure cache observer — `skipToken` means it never fetches. It re-renders when
  // the total lands under `totalKey`, and reads `undefined` after a search change
  // (a new key) until that search's own count arrives — a stale total never shows.
  const cachedTotal = useQuery<number | null>({
    queryKey: totalKey,
    queryFn: skipToken,
  }).data;
  // Observed unconditionally (it's a hook) but only reported when counting is on.
  const total =
    count && typeof cachedTotal === "number" ? cachedTotal : undefined;

  return makeGridData({
    page: page.data && { ...page.data, total },
    loading: page.isFetching,
    error: page.error ?? undefined,
    reload: () => {
      client.removeQueries({ queryKey: totalKey });
      void page.refetch();
    },
  });
}
