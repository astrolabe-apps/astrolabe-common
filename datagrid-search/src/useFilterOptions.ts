/**
 * Resolving a column's filter options, whichever of the four source shapes it
 * has, into one `FilterOptions`.
 *
 * Called from inside the popup surface, which only mounts on open — so an async
 * source doesn't fetch until the funnel is clicked, and never at all for a column
 * nobody filters. That laziness is structural rather than something this module
 * arranges.
 *
 * Resolution order, three deep:
 *   1. the column's own `options`
 *   2. `data.facets[field]` (server) or `data.optionRows(field)` (client)
 *   3. nothing — and nothing means the renderer shows no filter control
 */
import { useEffect, useMemo, useState } from "react";
import type { Control } from "@react-typed-forms/core";
import { useControl } from "@react-typed-forms/core";
import type { ColumnDef } from "@astroapps/datagrid";
import type { SearchOptions } from "@astroapps/searchstate";
import type { FilterOption, GridData } from "./types";
import {
  deriveFilterOptions,
  filterOptionSourceKind,
  noFilterOptions,
  type FilterOptions,
  type FilterOptionsContext,
} from "./options";
import { columnFilterValue } from "./columns";
import { filterFieldOf, type ColumnFilter } from "./filter";

interface CacheEntry {
  options?: FilterOption[];
  loading: boolean;
  error?: unknown;
}

/** Async results, so they survive a popover closing and reopening. */
export type FilterOptionsCache = Control<Record<string, CacheEntry>>;

export function useFilterOptionsCache(): FilterOptionsCache {
  return useControl<Record<string, CacheEntry>>({});
}

export interface UseFilterOptionsArgs<T, D> {
  column: ColumnDef<T, D>;
  filter: ColumnFilter<T> | undefined;
  data: GridData<T>;
  state: Control<SearchOptions>;
  cache: FilterOptionsCache;
  /** Cap on distinct values derived from rows. Defaults to 100. */
  maxFilterOptions?: number;
}

/**
 * **A column's source *kind* must not change between renders.** The `{ hook }`
 * variant is invoked as a hook, so a column that switched from, say, static to
 * hook would change this component's hook order. Kinds are fixed per column in
 * every real use — the resolver caches the config per column id — but it's a
 * constraint rather than something enforced.
 */
export function useFilterOptions<T, D = unknown>(
  args: UseFilterOptionsArgs<T, D>,
): FilterOptions {
  const { column, filter, data, state, cache, maxFilterOptions = 100 } = args;

  const field = filter ? filterFieldOf(column, filter) : undefined;
  const source = filter?.options;
  const kind = source ? filterOptionSourceKind(source) : undefined;

  const fields = state.fields;
  const filters = fields.filters.value ?? {};
  const query = fields.query.value;

  // Cascading options depend on the other filters, so they're part of the key —
  // change one column's selection and a dependent column refetches.
  const cacheKey = useMemo(
    () =>
      kind === "async" && field
        ? `${field}|${query ?? ""}|${JSON.stringify(filters)}`
        : undefined,
    [kind, field, query, filters],
  );

  const [reloadCount, setReloadCount] = useState(0);
  const entry = cacheKey ? cache.value[cacheKey] : undefined;

  useEffect(() => {
    if (!cacheKey || !field || kind !== "async") return;
    // Already settled for this key: nothing to do until reload() bumps the count.
    if (entry && !entry.loading && reloadCount === 0) return;

    const controller = new AbortController();
    const ctx: FilterOptionsContext = {
      field,
      filters,
      query,
      signal: controller.signal,
    };
    cache.setValue((current) => ({
      ...current,
      [cacheKey]: { ...current[cacheKey], loading: true, error: undefined },
    }));

    (source as (c: FilterOptionsContext) => Promise<FilterOption[]>)(ctx).then(
      (options) => {
        if (controller.signal.aborted) return;
        cache.setValue((current) => ({
          ...current,
          [cacheKey]: { options, loading: false },
        }));
      },
      (error) => {
        if (controller.signal.aborted) return;
        cache.setValue((current) => ({
          ...current,
          [cacheKey]: { ...current[cacheKey], loading: false, error },
        }));
      },
    );

    return () => controller.abort();
    // `entry` is intentionally absent: it changes as a *result* of this effect,
    // and the guard above reads it only to skip already-settled keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, field, kind, reloadCount]);

  // Conditional by design — see the note on this function. Kept last so the
  // unconditional hooks above always run in the same order.
  const fromHook =
    kind === "hook" && field
      ? (
          source as {
            hook: (c: FilterOptionsContext) => FilterOptions;
          }
        ).hook({
          field,
          filters,
          query,
          // A hook source owns its own cancellation, so there's nothing useful to
          // pass; a never-aborted signal keeps the context shape uniform.
          signal: new AbortController().signal,
        })
      : undefined;

  const derived = useMemo(() => {
    if (!filter || !field) return undefined;
    if (kind === "static") return source as FilterOption[];
    if (kind === "derived") {
      const value = columnFilterValue(column);
      if (!value) return [];
      const { fromRows, max, counts } = source as {
        fromRows: () => T[];
        max?: number;
        counts?: boolean;
      };
      return deriveFilterOptions(fromRows(), value, {
        max: max ?? maxFilterOptions,
        counts,
      });
    }
    if (kind) return undefined; // async and hook are handled above
    // No source of its own: fall back to whatever the data source offers.
    if (data.facets) return data.facets[field] ?? [];
    if (data.optionRows) {
      const value = columnFilterValue(column);
      if (!value) return [];
      return deriveFilterOptions(data.optionRows(field), value, {
        max: maxFilterOptions,
      });
    }
    return undefined;
  }, [filter, field, kind, source, column, data, maxFilterOptions]);

  const reload = useMemo(() => () => setReloadCount((n) => n + 1), []);

  if (fromHook) return fromHook;
  if (kind === "async") {
    return {
      options: entry?.options ?? [],
      loading: entry?.loading ?? true,
      error: entry?.error,
      reload,
    };
  }
  if (derived === undefined) return noFilterOptions;
  return { options: derived, loading: data.loading, error: undefined, reload };
}

/**
 * Whether a column has any option source at all — the renderer's cue for showing
 * a filter control, without mounting a popup to find out.
 */
export function hasFilterOptions<T, D>(
  column: ColumnDef<T, D>,
  filter: ColumnFilter<T> | undefined,
  data: GridData<T>,
): boolean {
  if (!filter) return false;
  if (filter.options) return true;
  return !!data.facets || !!data.optionRows;
}
