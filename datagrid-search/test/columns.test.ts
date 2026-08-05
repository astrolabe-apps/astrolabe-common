import { describe, expect, it } from "@jest/globals";
import { columnDefinitions } from "@astroapps/datagrid";
import {
  makeClientSortAndFilter,
  sortBySortFields,
} from "@astroapps/searchstate";
import {
  columnComparator,
  columnFilterValue,
  columnSearching,
  encodeSortField,
  findColumn,
  leafColumns,
  sortDirectionChar,
  sortEntryField,
  sortFieldDirection,
} from "../src";

interface Row {
  file: string;
  kind: string;
  size: number;
}

const rows: Row[] = [
  { file: "notes", kind: "doc", size: 3 },
  { file: "logo", kind: "img", size: 1 },
  { file: "readme", kind: "doc", size: 2 },
];

const columns = columnDefinitions<Row>(
  { title: "File", getter: (r) => r.file, sortField: "file" },
  {
    title: "Meta",
    children: [
      { title: "Kind", getter: (r) => r.kind, filterField: "kind" },
      { title: "Size", getter: (r) => r.size, sortField: "size" },
    ],
  },
  { title: "Actions", render: () => null },
);

describe("findColumn", () => {
  it("finds a nested column", () => {
    expect(findColumn(columns, (c) => c.sortField === "size")?.title).toBe(
      "Size",
    );
  });

  it("finds a top-level column", () => {
    expect(findColumn(columns, (c) => c.title === "File")?.title).toBe("File");
  });

  it("returns undefined when nothing matches", () => {
    expect(findColumn(columns, (c) => c.sortField === "nope")).toBeUndefined();
  });
});

describe("leafColumns", () => {
  it("flattens to value-bearing leaves, skipping groups and render-only", () => {
    expect(leafColumns(columns).map((c) => c.title)).toEqual([
      "File",
      "Kind",
      "Size",
    ]);
  });

  it("honours a custom include", () => {
    expect(
      leafColumns(columns, (c) => !!c.sortField).map((c) => c.title),
    ).toEqual(["File", "Size"]);
  });
});

describe("sort field encoding", () => {
  it("round-trips a field and direction", () => {
    expect(encodeSortField("file", "asc")).toBe("afile");
    expect(encodeSortField("file", "desc")).toBe("dfile");
    expect(sortEntryField("dfile")).toBe("file");
  });

  it("defaults an absent direction to ascending", () => {
    expect(sortDirectionChar(undefined)).toBe("a");
  });

  it("reads a direction back out of a sort list", () => {
    expect(sortFieldDirection(["dfile"], "file")).toBe("desc");
    expect(sortFieldDirection(["afile"], "file")).toBe("asc");
    expect(sortFieldDirection(["afile"], "size")).toBeUndefined();
    expect(sortFieldDirection(null, "file")).toBeUndefined();
    expect(sortFieldDirection(["afile"], undefined)).toBeUndefined();
  });
});

describe("columnComparator", () => {
  it("compares by getter when no compare is supplied", () => {
    const [fileCol] = columns;
    const compare = columnComparator(fileCol)!;
    expect(compare(rows[0], rows[1])).toBeGreaterThan(0);
  });

  it("prefers an explicit compare", () => {
    const [reversed] = columnDefinitions<Row>({
      title: "File",
      getter: (r) => r.file,
      compare: (a, b) => b.file.localeCompare(a.file),
    });
    expect(columnComparator(reversed)!(rows[0], rows[1])).toBeLessThan(0);
  });

  it("is undefined for a column with no getter or compare", () => {
    const actions = findColumn(columns, (c) => c.title === "Actions");
    expect(columnComparator(actions)).toBeUndefined();
    expect(columnComparator(undefined)).toBeUndefined();
  });
});

describe("columnFilterValue", () => {
  it("derives value and label from the getter", () => {
    const kind = findColumn(columns, (c) => c.filterField === "kind")!;
    expect(columnFilterValue(kind)!(rows[0])).toEqual({
      value: "doc",
      label: "doc",
    });
  });

  it("labels an empty value, as getterToFilter does", () => {
    const [nullable] = columnDefinitions<Row>({
      title: "Kind",
      getter: () => null,
      filterField: "kind",
    });
    expect(columnFilterValue(nullable)!(rows[0])).toEqual({
      value: "",
      label: "<Empty>",
    });
  });

  it("is undefined when there is nothing to read", () => {
    expect(
      columnFilterValue(findColumn(columns, (c) => c.title === "Actions")),
    ).toBeUndefined();
  });
});

describe("columnSearching", () => {
  const searching = columnSearching(columns);

  it("builds lower-cased search text from value columns", () => {
    expect(searching.getSearchText(rows[0])).toContain("notes");
    expect(searching.getSearchText(rows[0])).toContain("doc");
  });

  it("does not let a query match across a column boundary", () => {
    // Columns are NUL-joined precisely so "notesdoc" isn't a hit.
    expect(searching.getSearchText(rows[0]).includes("notesdoc")).toBe(false);
  });

  it("resolves comparisons by sortField", () => {
    expect(searching.getComparison("size")).toBeDefined();
    expect(searching.getComparison("kind")).toBeUndefined();
  });

  it("resolves filter values by filterField", () => {
    expect(searching.getFilterValue("kind")!(rows[0])).toBe("doc");
    expect(searching.getFilterValue("file")).toBeUndefined();
  });

  it("takes an override for filter value resolution", () => {
    // The filter layer decides a column's field via getColumnFilter, so it has to
    // be able to supply the accessor rather than have filterField assumed.
    const overridden = columnSearching(columns, {
      getFilterValue: (field) =>
        field === "custom" ? (row) => row.kind : undefined,
    });
    expect(overridden.getFilterValue("custom")!(rows[0])).toBe("doc");
    expect(overridden.getFilterValue("kind")).toBeUndefined();
  });

  it("drives searchstate's sort and filter end to end", () => {
    // The point of this module: searchstate should need nothing else.
    const result = makeClientSortAndFilter(searching)(
      { query: "", sort: ["dsize"], filters: { kind: ["doc"] } },
      rows,
    );
    expect(result.map((r) => r.file)).toEqual(["notes", "readme"]);
  });

  it("drives a free-text query", () => {
    const result = makeClientSortAndFilter(searching)(
      { query: "log", sort: [], filters: {} },
      rows,
    );
    expect(result.map((r) => r.file)).toEqual(["logo"]);
  });

  it("sorts by multiple fields in precedence order", () => {
    const sorted = sortBySortFields(
      searching.getComparison,
      ["akind", "dsize"],
      rows,
    );
    expect(sorted.map((r) => r.file)).toEqual(["notes", "readme", "logo"]);
  });
});
