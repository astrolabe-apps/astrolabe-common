import { describe, expect, it } from "@jest/globals";
import {
  defaultSearchOptions,
  type SearchRequest,
} from "@astroapps/searchstate";
import { pageInfo, type GridData } from "../src";

function data(rowCount: number, total?: number): GridData<number> {
  const rows = Array.from({ length: rowCount }, (_, i) => i);
  return {
    rows,
    total,
    loading: false,
    reload: () => {},
    rowProps: { bodyRows: rowCount, getBodyRow: (i) => rows[i] },
  };
}

function options(over: Partial<SearchRequest> = {}): SearchRequest {
  return { ...defaultSearchOptions, length: 10, ...over };
}

describe("pageInfo with a known total", () => {
  it("describes the first of several pages", () => {
    expect(pageInfo(options(), data(10, 42))).toEqual({
      from: 1,
      to: 10,
      total: 42,
      hasPrevious: false,
      hasMore: true,
      totalUnknown: false,
    });
  });

  it("describes a middle page", () => {
    const info = pageInfo(options({ offset: 10 }), data(10, 42));
    expect([info.from, info.to]).toEqual([11, 20]);
    expect(info.hasPrevious).toBe(true);
    expect(info.hasMore).toBe(true);
  });

  it("describes the last, partial page", () => {
    const info = pageInfo(options({ offset: 40 }), data(2, 42));
    expect([info.from, info.to]).toEqual([41, 42]);
    expect(info.hasMore).toBe(false);
  });

  it("knows an exactly-full last page is the last", () => {
    // The case the uncounted heuristic gets wrong, and a total gets right.
    const info = pageInfo(options({ offset: 30 }), data(10, 40));
    expect(info.hasMore).toBe(false);
  });

  it("reports zeros for an empty result", () => {
    const info = pageInfo(options(), data(0, 0));
    expect([info.from, info.to]).toEqual([0, 0]);
    expect(info.hasMore).toBe(false);
    expect(info.totalUnknown).toBe(false);
  });
});

describe("pageInfo without a total", () => {
  it("still gives a range", () => {
    const info = pageInfo(options({ offset: 20 }), data(10));
    expect([info.from, info.to]).toEqual([21, 30]);
    expect(info.total).toBeUndefined();
    expect(info.totalUnknown).toBe(true);
  });

  it("infers there is more from a full page", () => {
    expect(pageInfo(options(), data(10)).hasMore).toBe(true);
  });

  it("infers the end from a partial page", () => {
    expect(pageInfo(options(), data(4)).hasMore).toBe(false);
  });

  it("infers the end from an empty page", () => {
    expect(pageInfo(options({ offset: 10 }), data(0)).hasMore).toBe(false);
  });

  it("over-reports at an exact multiple, as documented", () => {
    // 20 rows, 10 per page: page 2 is full, so Next stays enabled and page 3
    // comes back empty. The price of not counting.
    const info = pageInfo(options({ offset: 10 }), data(10));
    expect(info.hasMore).toBe(true);
  });

  it("distinguishes uncounted from counted-as-zero", () => {
    expect(pageInfo(options(), data(0)).totalUnknown).toBe(true);
    expect(pageInfo(options(), data(0, 0)).totalUnknown).toBe(false);
  });
});
