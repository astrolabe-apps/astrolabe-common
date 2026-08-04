import { afterEach, describe, expect, it } from "@jest/globals";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { newControl, useComponentTracking } from "@react-typed-forms/core";
import { columnDefinitions, type ColumnDef } from "@astroapps/datagrid";
import {
  defaultSearchOptions,
  type SearchOptions,
} from "@astroapps/searchstate";
import {
  useClientData,
  useGridSearch,
  type GetColumnFilter,
} from "@astroapps/datagrid-search";
import { FluentDataGrid } from "../src";

interface Row {
  file: string;
  kind: string;
}

const rows: Row[] = [
  { file: "notes", kind: "doc" },
  { file: "logo", kind: "img" },
  { file: "readme", kind: "doc" },
];

/** Nothing sortable, nothing filterable. */
const plainColumns = columnDefinitions<Row>(
  { title: "File", getter: (r) => r.file },
  { title: "Kind", getter: (r) => r.kind },
);

/** Both affordances available. */
const richColumns = columnDefinitions<Row>(
  { title: "File", getter: (r) => r.file, sortField: "file" },
  { title: "Kind", getter: (r) => r.kind, filterField: "kind" },
);

function Harness({
  columns,
  over,
  getColumnFilter,
  pager,
}: {
  columns: ColumnDef<Row, unknown>[];
  over?: Partial<SearchOptions>;
  getColumnFilter?: GetColumnFilter<Row>;
  pager?: boolean;
}) {
  // ts-jest doesn't apply @react-typed-forms/transform, so tracking is installed
  // by hand — the same thing the transform does to the package's own sources.
  // Enough for asserting what a first render produces; interaction is covered by
  // the demo harness, which runs through the real build.
  const stop = useComponentTracking();
  try {
    const state = newControl<SearchOptions>({
      ...defaultSearchOptions,
      length: 10,
      ...over,
    });
    const data = useClientData(state, { rows, columns, getColumnFilter });
    const search = useGridSearch(state, { columns, data, getColumnFilter });
    return (
      <FluentProvider theme={webLightTheme}>
        <FluentDataGrid search={search} pager={pager} />
      </FluentProvider>
    );
  } finally {
    stop();
  }
}

afterEach(cleanup);

describe("a grid with nothing enabled", () => {
  // Phase 4's acceptance: every affordance is opt-in through column metadata, so
  // a plain column set gets a plain table.
  it("renders the rows", () => {
    render(<Harness columns={plainColumns} />);
    expect(screen.getByText("notes")).toBeDefined();
    expect(screen.getByText("readme")).toBeDefined();
  });

  it("renders no sort indication", () => {
    render(<Harness columns={plainColumns} />);
    expect(document.querySelector("[aria-sort]")).toBeNull();
    expect(
      document.querySelector(".astro-FluentDataGrid__sortIcon"),
    ).toBeNull();
  });

  it("renders no filter buttons", () => {
    render(<Harness columns={plainColumns} />);
    expect(screen.queryByLabelText("Filter")).toBeNull();
  });

  it("renders no pager when everything fits on one page", () => {
    render(<Harness columns={plainColumns} />);
    expect(screen.queryByLabelText("Next page")).toBeNull();
  });

  it("renders no selection column", () => {
    render(<Harness columns={plainColumns} />);
    expect(screen.queryByLabelText(/Select/)).toBeNull();
  });
});

describe("a grid with sort and filter available", () => {
  it("renders a filter button for the filterable column only", () => {
    render(<Harness columns={richColumns} />);
    // One funnel: Kind has a filterField and the client source can derive its
    // options; File has neither.
    expect(screen.getAllByLabelText("Filter")).toHaveLength(1);
  });

  it("marks the sorted column with aria-sort", () => {
    render(<Harness columns={richColumns} over={{ sort: ["dfile"] }} />);
    const sorted = document.querySelector("[aria-sort]");
    expect(sorted?.getAttribute("aria-sort")).toBe("descending");
  });

  it("shows the filter button as active when a filter is applied", () => {
    render(
      <Harness columns={richColumns} over={{ filters: { kind: ["doc"] } }} />,
    );
    expect(screen.getByLabelText("Filter (Kind, filtered)")).toBeDefined();
  });

  it("renders a pager once there is more than one page", () => {
    render(<Harness columns={richColumns} over={{ length: 2 }} />);
    expect(screen.getByLabelText("Next page")).toBeDefined();
    expect(screen.getByText("1-2 of 3")).toBeDefined();
  });

  it("suppresses the pager on request", () => {
    render(
      <Harness columns={richColumns} over={{ length: 2 }} pager={false} />,
    );
    expect(screen.queryByLabelText("Next page")).toBeNull();
  });

  it("reports no data without inventing rows", () => {
    render(<Harness columns={richColumns} over={{ query: "nothing" }} />);
    expect(screen.getByText("No data")).toBeDefined();
  });
});
