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

export interface ServerDataOptions<T> {
  /**
   * Fetches one page. Held in a ref and **not** a refetch trigger, so an inline
   * arrow here won't loop — what drives refetching is the search state, plus
   * `deps`.
   */
  fetch: (options: SearchOptions, signal: AbortSignal) => Promise<GridPage<T>>;
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

export function useServerData<T>(
  state: Control<SearchOptions>,
  options: ServerDataOptions<T>,
): GridData<T> {
  const { fetch, debounce = 300, keepPrevious = true, deps } = options;

  const searchOptions = useDebouncedSearchOptions(state, debounce);

  // Ref'd so a caller's inline `fetch={(o, s) => api.search(o, s)}` doesn't make
  // every render a refetch. The effect reads the current one when it runs.
  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;

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

  const reload = useMemo(() => () => setReloadCount((n) => n + 1), []);

  return useMemo(
    () =>
      makeGridData({
        page: result.page,
        loading: result.loading,
        error: result.error,
        reload,
      }),
    [result, reload],
  );
}
