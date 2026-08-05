import { describe, expect, it } from "@jest/globals";
import {
  deriveFilterOptions,
  filterOptionSourceKind,
  noFilterOptions,
  type FilterOption,
  type FilterOptionSource,
} from "../src";

interface Row {
  kind: string;
}

const value = (row: Row): FilterOption => ({
  value: row.kind,
  label: row.kind.toUpperCase(),
});

describe("filterOptionSourceKind", () => {
  const cases: [string, FilterOptionSource<Row>, string][] = [
    ["a static array", [{ value: "a" }], "static"],
    ["an async function", async () => [], "async"],
    ["a fromRows object", { fromRows: () => [] }, "derived"],
    ["a hook object", { hook: () => noFilterOptions }, "hook"],
  ];

  it.each(cases)("classifies %s", (_label, source, expected) => {
    expect(filterOptionSourceKind(source)).toBe(expected);
  });

  it("classifies an empty array as static, not derived", () => {
    // Arrays are objects, so ordering inside the classifier matters.
    expect(filterOptionSourceKind([])).toBe("static");
  });
});

describe("deriveFilterOptions", () => {
  const rows: Row[] = [
    { kind: "doc" },
    { kind: "img" },
    { kind: "doc" },
    { kind: "doc" },
  ];

  it("collects distinct values with counts, sorted by label", () => {
    expect(deriveFilterOptions(rows, value)).toEqual([
      { value: "doc", label: "DOC", count: 3 },
      { value: "img", label: "IMG", count: 1 },
    ]);
  });

  it("omits counts when asked", () => {
    expect(deriveFilterOptions(rows, value, { counts: false })).toEqual([
      { value: "doc", label: "DOC" },
      { value: "img", label: "IMG" },
    ]);
  });

  it("sorts by value when there is no label", () => {
    const bare = [{ kind: "b" }, { kind: "a" }];
    expect(
      deriveFilterOptions(bare, (r) => ({ value: r.kind }), { counts: false }),
    ).toEqual([{ value: "a" }, { value: "b" }]);
  });

  it("caps the number of distinct values", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ kind: `k${i}` }));
    expect(deriveFilterOptions(many, value, { max: 3 })).toHaveLength(3);
  });

  it("keeps counting values it has already seen after hitting the cap", () => {
    // The cap bounds distinct values, not rows scanned — but scanning stops at
    // the cap, so counts only cover rows up to that point. Pinning the behaviour
    // so it's a decision rather than a surprise.
    const capped = deriveFilterOptions(
      [{ kind: "a" }, { kind: "a" }, { kind: "b" }],
      value,
      { max: 1 },
    );
    expect(capped).toEqual([{ value: "a", label: "A", count: 2 }]);
  });

  it("does not mutate the options it is handed", () => {
    const shared: FilterOption = { value: "doc", label: "DOC" };
    deriveFilterOptions(rows, () => shared);
    expect(shared.count).toBeUndefined();
  });

  it("returns nothing for no rows", () => {
    expect(deriveFilterOptions([], value)).toEqual([]);
  });
});

describe("noFilterOptions", () => {
  it("is a settled empty result", () => {
    expect(noFilterOptions.options).toEqual([]);
    expect(noFilterOptions.loading).toBe(false);
    expect(() => noFilterOptions.reload()).not.toThrow();
  });
});
