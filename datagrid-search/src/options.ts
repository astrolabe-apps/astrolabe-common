/**
 * Where a column's filter values come from.
 *
 * Four shapes, because the answer differs per deployment: a fixed list, an
 * endpoint, the rows already in memory, or whatever caching library the app
 * already uses. The consumer of all four is one `FilterOptions` result, so the
 * popup doesn't care which it got.
 *
 * This module is pure. The caching/aborting hook that turns an async source into
 * a `FilterOptions` lives with the other hooks.
 */
import type { SearchFilters } from "@astroapps/searchstate";
import type { FilterOption } from "./types";

/** Passed to async and hook sources, so options can depend on the search. */
export interface FilterOptionsContext {
  field: string;
  /** Other columns' filters — for cascading/dependent options. */
  filters: SearchFilters;
  query: string | null;
  signal: AbortSignal;
}

/** The loaded (or loading) options for one column. */
export interface FilterOptions {
  options: FilterOption[];
  loading: boolean;
  error?: unknown;
  reload(): void;
}

/** Options derived from rows already in memory. */
export interface DerivedFilterOptions<T> {
  /** The rows to scan. A function so it isn't captured stale. */
  fromRows: () => T[];
  /** Cap on distinct values collected. Defaults to 100. */
  max?: number;
  /** Include per-value row counts. Defaults to true. */
  counts?: boolean;
}

/** Options produced by the caller's own hook — react-query and friends. */
export interface HookFilterOptions {
  hook: (ctx: FilterOptionsContext) => FilterOptions;
}

export type AsyncFilterOptions = (
  ctx: FilterOptionsContext,
) => Promise<FilterOption[]>;

export type FilterOptionSource<T> =
  | FilterOption[]
  | AsyncFilterOptions
  | DerivedFilterOptions<T>
  | HookFilterOptions;

export type FilterOptionSourceKind = "static" | "async" | "derived" | "hook";

/**
 * Which of the four shapes a source is. Order matters: an array is checked first
 * because it's also an object, and a function before the object shapes because
 * `AsyncFilterOptions` is callable.
 */
export function filterOptionSourceKind(
  source: FilterOptionSource<any>,
): FilterOptionSourceKind {
  if (Array.isArray(source)) return "static";
  if (typeof source === "function") return "async";
  return "hook" in source ? "hook" : "derived";
}

/** An empty, settled result — for columns with no source at all. */
export const noFilterOptions: FilterOptions = {
  options: [],
  loading: false,
  reload: () => {},
};

/**
 * Distinct options from a set of rows, sorted by label.
 *
 * Counts are per distinct value across every row scanned, so they're only
 * meaningful when the caller passes rows that reflect the other columns' filters
 * — which is exactly what the client-side source does.
 *
 * `max` bounds the number of *distinct* values, not rows read: scanning stops
 * once the cap is hit, so counts for the values collected may undercount rows
 * beyond that point. That's the same trade the previous implementation made, and
 * the alternative is scanning a large array to completion for a dropdown.
 */
export function deriveFilterOptions<T>(
  rows: T[],
  value: (row: T) => FilterOption,
  options: { max?: number; counts?: boolean } = {},
): FilterOption[] {
  const { max = 100, counts = true } = options;
  const byValue = new Map<string, FilterOption>();
  for (const row of rows) {
    const option = value(row);
    const existing = byValue.get(option.value);
    if (existing) {
      if (counts) existing.count = (existing.count ?? 0) + 1;
      continue;
    }
    if (byValue.size >= max) break;
    byValue.set(option.value, counts ? { ...option, count: 1 } : { ...option });
  }
  return [...byValue.values()].sort((a, b) =>
    (a.label ?? a.value).localeCompare(b.label ?? b.value),
  );
}
