/**
 * Server-side searching: refetch when the search changes.
 *
 * This is where the concurrency lives — debounce, abort, out-of-order responses
 * and keep-previous — none of which the client path has, so bugs here are
 * invisible from the other mode. The rule it enforces: **a stale response never
 * wins**, checked by request sequence rather than by abort alone, because an
 * abort can lose the race with a `.then` already queued as a microtask.
 *
 * If the app already uses react-query, prefer that plus `makeGridData` — see
 * `interop.ts`. This exists so a server-side grid needs no extra dependency.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Control } from "@react-typed-forms/core";
import type { SearchOptions } from "@astroapps/searchstate";
import type { GridData, GridPage } from "./types";
import { makeGridData, useDebouncedSearchOptions } from "./interop";

export interface ServerDataOptions<T, S extends SearchOptions = SearchOptions> {
  /**
   * Fetches one page. Held in a ref and **not** a refetch trigger, so an inline
   * arrow here won't loop — what drives refetching is the search state, plus
   * `deps`.
   *
   * Receives the state's *whole* value, so a state that extends `SearchOptions`
   * with filtering of its own — a date range, a tenant, a "show archived" toggle —
   * gets those fields here and in the refetch key without any extra wiring.
   */
  fetch: (options: S, signal: AbortSignal) => Promise<GridPage<T>>;
  /**
   * Fetches the row count separately.
   *
   * Counting is often a second query over the whole filtered set, so this runs
   * **in parallel** with the page rather than gating it: rows render as soon as
   * they arrive and the total fills in when it lands. Only used when `fetch`
   * didn't return a `total` itself.
   *
   * The rule is **"no total? ask for one; a change of search clears it."** So
   * paging never re-counts — paging isn't a change of search, since offset, length
   * and sort are excluded from what counts as one.
   *
   * Because it runs in parallel it starts before the page lands, so it can't know
   * in advance whether the page will bring a total of its own. If it does, the
   * in-flight count is aborted and ignored. Passing `fetchTotal` therefore asserts
   * that your page fetch doesn't count; an endpoint that sometimes does will see a
   * cancelled count request.
   *
   * In normal use that means the request lands at `offset` 0, since changing the
   * query or a filter resets paging. But "the search changed" is the condition,
   * not "we're on the first page": guarding on `offset === 0` would leave a
   * restored URL like `?offset=30` with no total at all.
   */
  fetchTotal?: (options: S, signal: AbortSignal) => Promise<number>;
  /** Debounce for `query` only. Defaults to 300ms; 0 disables it. */
  debounce?: number;
  /** Keep the previous page visible while refetching. Defaults to true. */
  keepPrevious?: boolean;
  /**
   * Extra refetch triggers beyond the search state — a tenant id, a "show
   * archived" toggle. Must keep a stable length between renders, as with any
   * dependency list.
   */
  deps?: unknown[];
}

interface FetchState<T> {
  page: GridPage<T> | undefined;
  loading: boolean;
  error?: unknown;
}

export function useServerData<T, S extends SearchOptions = SearchOptions>(
  state: Control<S>,
  options: ServerDataOptions<T, S>,
): GridData<T> {
  const {
    fetch,
    fetchTotal,
    debounce = 300,
    keepPrevious = true,
    deps,
  } = options;

  const searchOptions = useDebouncedSearchOptions(state, debounce);

  // Ref'd so a caller's inline `fetch={(o, s) => api.search(o, s)}` doesn't make
  // every render a refetch. The effect reads the current one when it runs.
  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;
  const fetchTotalRef = useRef(fetchTotal);
  fetchTotalRef.current = fetchTotal;
  const optionsRef = useRef(searchOptions);
  optionsRef.current = searchOptions;

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<FetchState<T>>({
    page: undefined,
    loading: true,
  });

  // Monotonic request id. `sequence.current` is the only request whose result may
  // be applied, so a slow earlier response can't overwrite a fast later one.
  const sequence = useRef(0);

  useEffect(() => {
    const id = ++sequence.current;
    const controller = new AbortController();
    const isCurrent = () =>
      id === sequence.current && !controller.signal.aborted;

    setResult((previous) => ({
      page: keepPrevious ? previous.page : undefined,
      loading: true,
      error: undefined,
    }));

    fetchRef.current(searchOptions, controller.signal).then(
      (page) => {
        if (!isCurrent()) return;
        setResult({ page, loading: false });
      },
      (error) => {
        if (!isCurrent()) return;
        setResult((previous) => ({
          page: keepPrevious ? previous.page : undefined,
          loading: false,
          error,
        }));
      },
    );

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOptions, reloadCount, keepPrevious, ...(deps ?? [])]);

  // --- The count ----------------------------------------------------------
  //
  // The rule: **if there's no total, ask for one; a change of search clears it.**
  //
  // So a page that carries its own total costs no count request at all — which
  // matters for an API that returns one only when it's cheap — and paging never
  // re-counts, because paging isn't a change of search.
  //
  // `searchKey` is what "a change of search" means: everything except offset,
  // length and sort, none of which can alter a count. Written as an exclusion so a
  // state extending SearchOptions is covered without naming its fields. Keying the
  // attempt, rather than testing `total === undefined` alone, is also what stops a
  // failed count retrying forever — the attempt is recorded against the search, so
  // it isn't repeated until the search moves. `reload()` folds in so it re-counts.
  const pageTotal = result.page?.total;
  const havePageTotal = pageTotal !== undefined;
  const searchKey = useMemo(() => {
    const { offset, length, sort, ...search } = searchOptions;
    return `${reloadCount}:${JSON.stringify(search)}`;
  }, [searchOptions, reloadCount]);

  const [count, setCount] = useState<{ key: string; value?: number }>();
  const counted = count?.key === searchKey;

  useEffect(() => {
    const request = fetchTotalRef.current;
    if (!request || havePageTotal || counted) return;
    const controller = new AbortController();
    // Reads the current options from a ref: paging may have moved on since the key
    // last changed, and is irrelevant to counting anyway.
    request(optionsRef.current, controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) setCount({ key: searchKey, value });
      },
      () => {
        // A failed count must not break the grid: record the attempt so it isn't
        // retried, and fall back to not knowing the total, which the pager handles.
        if (!controller.signal.aborted) setCount({ key: searchKey });
      },
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, counted, havePageTotal, ...(deps ?? [])]);

  const reload = useMemo(() => () => setReloadCount((n) => n + 1), []);

  return useMemo(() => {
    const data = makeGridData({
      page: result.page,
      loading: result.loading,
      error: result.error,
      reload,
    });
    // A separately-fetched count only applies to the search it was made for; a
    // stale total is worse than none.
    return havePageTotal || !counted ? data : { ...data, total: count?.value };
  }, [result, reload, havePageTotal, counted, count]);
}
