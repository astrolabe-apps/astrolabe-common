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
   * **Counted once per search.** The key excludes `offset`, `length` and `sort`,
   * none of which can change a count, so paging and sorting never ask again.
   *
   * That means in normal use the request happens at `offset` 0, because changing
   * the query or a filter resets paging — but "the search changed" is the
   * condition, not "we're on the first page". Guarding on `offset === 0` would
   * leave a restored URL like `?offset=30` with no total at all, and would skip a
   * genuinely-changed count when `resetPaging` is off.
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

  // --- The count, when asked for separately -------------------------------
  //
  // Keyed on everything a count can actually depend on, written as an *exclusion*
  // of offset/length/sort rather than a list of query+filters: a state that
  // extends SearchOptions with filtering of its own is then included
  // automatically, and forgetting one would mean serving a stale count.
  //
  // The effect reads the current options from a ref, since paging may have moved
  // on since the key last changed and is irrelevant to counting anyway.
  const countKey =
    fetchTotal &&
    JSON.stringify(
      (({ offset, length, sort, ...rest }) => rest)(searchOptions),
    );
  const [count, setCount] = useState<{ key?: string; value?: number }>({});

  useEffect(() => {
    const request = fetchTotalRef.current;
    if (!countKey || !request) return;
    const controller = new AbortController();
    request(optionsRef.current, controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) setCount({ key: countKey, value });
      },
      () => {
        // A failed count must not break the grid: fall back to not knowing the
        // total, which the pager already handles.
        if (!controller.signal.aborted) setCount({ key: countKey });
      },
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countKey, reloadCount, ...(deps ?? [])]);

  const reload = useMemo(() => () => setReloadCount((n) => n + 1), []);

  return useMemo(() => {
    const data = makeGridData({
      page: result.page,
      loading: result.loading,
      error: result.error,
      reload,
    });
    // A page's own total wins; otherwise use the separate count, but only once
    // it matches the current query+filters — a stale count is worse than none.
    if (data.total === undefined && countKey && count.key === countKey) {
      return { ...data, total: count.value };
    }
    return data;
  }, [result, reload, countKey, count]);
}
