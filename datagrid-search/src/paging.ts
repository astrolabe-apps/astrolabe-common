/**
 * What a pager needs, whether or not the source counted the rows.
 *
 * Kept here rather than in each renderer so the "no total" inference is written
 * once, and so a caller building a `GridData` by hand gets it too.
 */
import type { SearchOptions } from "@astroapps/searchstate";
import type { GridData } from "./types";

export interface PageInfo {
  /** 1-based index of the first row on this page; 0 when there are none. */
  from: number;
  /** 1-based index of the last row on this page; 0 when there are none. */
  to: number;
  /** Total matching rows, or undefined when the source doesn't count. */
  total?: number;
  hasPrevious: boolean;
  /**
   * Whether there's a further page.
   *
   * Exact when `total` is known. Without it, inferred from the page being full —
   * which is right except at an exact multiple of the page size, where it reads
   * true once too often and the next page comes back empty. That's the honest
   * cost of not counting; the alternative is asking for `length + 1` rows and
   * rendering `length`.
   */
  hasMore: boolean;
  /** True when paging forward is guesswork rather than known. */
  totalUnknown: boolean;
}

export function pageInfo<T>(
  options: SearchOptions,
  data: GridData<T>,
): PageInfo {
  const { offset, length } = options;
  const count = data.rows.length;
  const total = data.total;
  return {
    from: count === 0 ? 0 : offset + 1,
    to: count === 0 ? 0 : offset + count,
    total,
    hasPrevious: offset > 0,
    hasMore: total === undefined ? count >= length : offset + count < total,
    totalUnknown: total === undefined,
  };
}
