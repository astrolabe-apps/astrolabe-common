import { describe, expect, it } from "@jest/globals";
import type { GridData, GridPage, FilterOption } from "../src";

/**
 * Scaffolding smoke test: proves ts-jest resolves the package's ESM sources and
 * that the `GridData` contract is satisfiable by a hand-built object — which is
 * the claim the react-query interop rests on. Real behaviour tests arrive with
 * the sort/filter/options modules.
 */
describe("contracts", () => {
  it("GridData can be built by hand from a page", () => {
    const page: GridPage<{ id: string }> = {
      rows: [{ id: "a" }, { id: "b" }],
      total: 7,
      facets: { kind: [{ value: "doc", label: "Document", count: 3 }] },
    };

    const data: GridData<{ id: string }> = {
      rows: page.rows,
      total: page.total,
      loading: false,
      reload: () => {},
      rowProps: {
        bodyRows: page.rows.length,
        getBodyRow: (i) => page.rows[i],
      },
    };

    expect(data.rowProps.bodyRows).toBe(2);
    expect(data.rowProps.getBodyRow(1).id).toBe("b");
    expect(data.total).toBe(7);
  });

  it("FilterOption only requires a value", () => {
    const bare: FilterOption = { value: "x" };
    expect(bare.label).toBeUndefined();
  });
});
