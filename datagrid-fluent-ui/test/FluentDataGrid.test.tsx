import { afterEach, describe, expect, it } from "@jest/globals";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { newControl, useComponentTracking } from "@react-typed-forms/core";
import { columnDefinitions, type ColumnDef } from "@astroapps/datagrid";
import {
  defaultSearchOptions,
  type SearchRequest,
} from "@astroapps/searchstate";
import {
  makeGridData,
  useClientData,
  useGridSearch,
  type GetColumnFilter,
} from "@astroapps/datagrid-search";
import {
  FilterOptionList,
  fluentDataGridClassNames,
  FluentDataGrid,
  makeGridSelection,
} from "../src";

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
  pageSizes,
  renderHeaderExtra,
  state: ownedState,
}: {
  columns: ColumnDef<Row, unknown>[];
  over?: Partial<SearchRequest>;
  getColumnFilter?: GetColumnFilter<Row>;
  pager?: boolean;
  pageSizes?: number[];
  renderHeaderExtra?: (column: ColumnDef<Row, unknown>) => React.ReactNode;
  /**
   * A state control owned by the test, for asserting what an interaction wrote.
   * Without one the harness makes a fresh control per render — fine for
   * first-render assertions, useless for writes, which would land on a control
   * the next render throws away.
   */
  state?: ReturnType<typeof newControl<SearchRequest>>;
}) {
  // ts-jest doesn't apply @react-typed-forms/transform, so tracking is installed
  // by hand — the same thing the transform does to the package's own sources.
  // Enough for asserting what a first render produces; interaction is covered by
  // the demo harness, which runs through the real build.
  const stop = useComponentTracking();
  try {
    const state =
      ownedState ??
      newControl<SearchRequest>({
        ...defaultSearchOptions,
        length: 10,
        ...over,
      });
    const data = useClientData(state, { rows, columns, getColumnFilter });
    const search = useGridSearch(state, {
      columns,
      data,
      getColumnFilter,
    });
    return (
      <FluentProvider theme={webLightTheme}>
        <FluentDataGrid
          search={search}
          pager={pager}
          pageSizes={pageSizes}
          renderHeaderExtra={renderHeaderExtra}
        />
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
    expect(screen.queryByLabelText(/^Filter/)).toBeNull();
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
    expect(
      screen
        .getAllByLabelText(/^Filter/)
        .map((b) => b.getAttribute("aria-label")),
    ).toEqual(["Filter (Kind)"]);
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

  it("keeps the pager on a single page when page sizes are offered", () => {
    // A size that fits every row would otherwise hide the only control that can
    // shrink it again. Prev/next are there but dead.
    render(<Harness columns={richColumns} pageSizes={[2, 10]} />);
    expect(screen.getByLabelText("Rows per page")).toBeDefined();
    expect(screen.getByLabelText("Next page").hasAttribute("disabled")).toBe(
      true,
    );
    expect(
      screen.getByLabelText("Previous page").hasAttribute("disabled"),
    ).toBe(true);
  });

  it("still suppresses the pager on request with page sizes offered", () => {
    render(
      <Harness columns={richColumns} pageSizes={[2, 10]} pager={false} />,
    );
    expect(screen.queryByLabelText("Rows per page")).toBeNull();
  });

  it("reports no data without inventing rows", () => {
    render(<Harness columns={richColumns} over={{ query: "nothing" }} />);
    expect(screen.getByText("No data")).toBeDefined();
  });
});

describe("filter option counts", () => {
  const counted = [
    { value: "doc", count: 2 },
    { value: "img", count: 1 },
  ];

  function renderList(showCounts?: boolean) {
    render(
      <FluentProvider theme={webLightTheme}>
        <FilterOptionList
          options={counted}
          selected={[]}
          onToggle={() => {}}
          showCounts={showCounts}
        />
      </FluentProvider>,
    );
  }

  it("brackets the count beside the label", () => {
    renderList();
    expect(screen.getByText("(2)")).toBeDefined();
    expect(screen.getByText("(1)")).toBeDefined();
  });

  it("omits counts when told to", () => {
    renderList(false);
    expect(screen.queryByText("(2)")).toBeNull();
    // The option itself is still there — only the count went.
    expect(screen.getByText("doc")).toBeDefined();
  });

  // `ColumnFilter.showCounts` reaches this list through `FluentFilterPopover`.
  // Opening that popover isn't testable here — its body calls `useControl`, and
  // ts-jest doesn't apply the tracking transform to these sources — so the
  // wiring is covered by the demo pages, which run through the real build.
});

/** A selectable grid, with the selection held where a page would hold it. */
function SelectableHarness({
  selected,
  selectOnRowClick,
  noRowKey,
  rowAriaLabel,
}: {
  selected: ReturnType<typeof newControl<string[]>>;
  selectOnRowClick?: boolean;
  /** Drops `rowKey`, so the row wrapper falls back to the index. */
  noRowKey?: boolean;
  rowAriaLabel?: string | ((row: Row, index: number) => string);
}) {
  const stop = useComponentTracking();
  try {
    const state = newControl<SearchRequest>({
      ...defaultSearchOptions,
      length: 10,
    });
    const data = useClientData(state, { rows, columns: richColumns });
    const search = useGridSearch(state, { columns: richColumns, data });
    const selection = makeGridSelection<Row>({
      selected,
      rows: data.rows,
      getId: (r) => r.file,
    });
    return (
      <FluentProvider theme={webLightTheme}>
        <FluentDataGrid
          search={search}
          selection={selection}
          selectOnRowClick={selectOnRowClick}
          rowKey={noRowKey ? undefined : (r) => r.file}
          selectionColumn={rowAriaLabel ? { rowAriaLabel } : undefined}
        />
      </FluentProvider>
    );
  } finally {
    stop();
  }
}

describe("selecting by clicking the row", () => {
  it("toggles the row a click landed in", () => {
    const selected = newControl<string[]>([]);
    render(<SelectableHarness selected={selected} />);
    fireEvent.click(screen.getByText("logo"));
    expect(selected.value).toEqual(["logo"]);
    fireEvent.click(screen.getByText("logo"));
    expect(selected.value).toEqual([]);
  });

  it("leaves the checkbox's own click to the checkbox", () => {
    // Both would fire for one click, and the row would undo what the box did.
    const selected = newControl<string[]>([]);
    render(<SelectableHarness selected={selected} />);
    fireEvent.click(screen.getAllByLabelText("Select row")[1]);
    expect(selected.value).toEqual(["logo"]);
  });

  it("stays out of it when told to", () => {
    const selected = newControl<string[]>([]);
    render(<SelectableHarness selected={selected} selectOnRowClick={false} />);
    fireEvent.click(screen.getByText("logo"));
    expect(selected.value).toEqual([]);
    // The checkbox column still works — it's the only way in now.
    fireEvent.click(screen.getAllByLabelText("Select row")[1]);
    expect(selected.value).toEqual(["logo"]);
  });

  it("marks clickable rows as such, and only those", () => {
    const selected = newControl<string[]>([]);
    const { unmount } = render(<SelectableHarness selected={selected} />);
    const cell = screen.getByText("logo");
    expect(getComputedStyle(cell).cursor).toBe("pointer");
    unmount();
    render(<SelectableHarness selected={selected} selectOnRowClick={false} />);
    expect(getComputedStyle(screen.getByText("logo")).cursor).not.toBe(
      "pointer",
    );
  });
});

/**
 * An uncounted source, as a server that won't pay for a COUNT(*) produces. The
 * pager has to work without knowing where the end is.
 */
function UncountedHarness({
  rowCount,
  over,
}: {
  rowCount: number;
  over?: Partial<SearchRequest>;
}) {
  const stop = useComponentTracking();
  try {
    const state = newControl<SearchRequest>({
      ...defaultSearchOptions,
      length: 2,
      ...over,
    });
    const page = rows.slice(0, rowCount);
    const data = makeGridData<Row>({ page: { rows: page } });
    const search = useGridSearch(state, { columns: richColumns, data });
    return (
      <FluentProvider theme={webLightTheme}>
        <FluentDataGrid search={search} />
      </FluentProvider>
    );
  } finally {
    stop();
  }
}

describe("a grid whose source does not count", () => {
  it("shows a range without a total", () => {
    render(<UncountedHarness rowCount={2} />);
    expect(screen.getByText("1-2")).toBeDefined();
    expect(screen.queryByText(/ of /)).toBeNull();
  });

  it("enables Next while the page is full", () => {
    // A full page might mean more rows, so Next stays usable — the inference
    // that stands in for a total.
    render(<UncountedHarness rowCount={2} />);
    expect(screen.getByLabelText("Next page").hasAttribute("disabled")).toBe(
      false,
    );
  });

  it("renders no pager at all for a single partial page", () => {
    // Partial first page: nothing before, nothing after, so no pager.
    render(<UncountedHarness rowCount={1} />);
    expect(screen.queryByLabelText("Previous page")).toBeNull();
    expect(screen.queryByLabelText("Next page")).toBeNull();
  });

  it("disables Next on a later, partial page", () => {
    render(<UncountedHarness rowCount={1} over={{ offset: 2 }} />);
    expect(
      screen.getByLabelText("Previous page").hasAttribute("disabled"),
    ).toBe(false);
    expect(screen.getByLabelText("Next page").hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByText("3-3")).toBeDefined();
  });
});

describe("additional header content", () => {
  it("renders it after the filter button, inside the same header cell", () => {
    render(
      <Harness
        columns={richColumns}
        renderHeaderExtra={(column) => <span>info:{column.title}</span>}
      />,
    );
    const extra = screen.getByText(/^info:Kind$/);
    const funnel = screen.getByLabelText("Filter (Kind)");
    // Siblings, extra last: DOCUMENT_POSITION_FOLLOWING === 4.
    expect(funnel.parentElement).toBe(extra.parentElement);
    expect(funnel.compareDocumentPosition(extra) & 4).toBe(4);
  });

  it("renders it for a column with no filter of its own", () => {
    render(
      <Harness
        columns={richColumns}
        renderHeaderExtra={(column) => <span>info:{column.title}</span>}
      />,
    );
    // File has neither sortField's funnel nor a filter — the extra still lands.
    expect(screen.getByText(/^info:File$/)).toBeDefined();
  });

  it("skips the columns it returns nothing for", () => {
    render(
      <Harness
        columns={richColumns}
        renderHeaderExtra={(column) =>
          column.title === "Kind" ? <span>info:Kind</span> : undefined
        }
      />,
    );
    expect(screen.queryByText(/^info:File$/)).toBeNull();
    expect(screen.getByText(/^info:Kind$/)).toBeDefined();
  });
});

describe("naming the filter buttons", () => {
  // With a bare "Filter" on every funnel, this grid would have two identically
  // named buttons — ambiguous to a screen reader and to getByLabelText alike.
  const bothFilterable = columnDefinitions<Row>(
    { title: "File", getter: (r) => r.file, filterField: "file" },
    { title: "Kind", getter: (r) => r.kind, filterField: "kind" },
  );

  it("names the column even when nothing is filtered", () => {
    render(<Harness columns={bothFilterable} />);
    expect(screen.getByLabelText("Filter (File)")).toBeDefined();
    expect(screen.getByLabelText("Filter (Kind)")).toBeDefined();
  });

  it("keeps the column name once a filter is applied", () => {
    render(
      <Harness
        columns={bothFilterable}
        over={{ filters: { kind: ["doc"] } }}
      />,
    );
    expect(screen.getByLabelText("Filter (Kind, filtered)")).toBeDefined();
    expect(screen.getByLabelText("Filter (File)")).toBeDefined();
  });
});

describe("the select-all row", () => {
  /*
    Excel mode's behaviour — what's ticked when nothing is filtered, what Apply
    writes, when it's refused — lives in `useFilterDraft`, and is covered
    end-to-end in the aria package, which drives the real popover. That isn't
    possible here: `FluentFilterPopover`'s body calls `useControl`, and ts-jest
    doesn't apply the tracking transform. What this package owns is the row
    itself, so that's what's asserted.
  */
  const options = [{ value: "doc" }, { value: "img" }];

  function renderList(selectAll?: {
    checked: boolean;
    indeterminate: boolean;
    onToggle?: (on: boolean) => void;
  }) {
    render(
      <FluentProvider theme={webLightTheme}>
        <FilterOptionList
          options={options}
          selected={selectAll?.checked ? ["doc", "img"] : []}
          onToggle={() => {}}
          selectAll={
            selectAll && { ...selectAll, onToggle: selectAll.onToggle ?? (() => {}) }
          }
        />
      </FluentProvider>,
    );
  }

  it("is absent unless asked for", () => {
    renderList();
    expect(screen.queryByLabelText("(Select All)")).toBeNull();
    expect(screen.queryByText("(Select All)")).toBeNull();
  });

  it("is ticked when everything is", () => {
    renderList({ checked: true, indeterminate: false });
    expect(screen.getByLabelText("(Select All)")).toHaveProperty(
      "checked",
      true,
    );
  });

  it("reports a partial selection as mixed", () => {
    // A native input's `indeterminate` property, which is what Fluent sets and
    // what assistive tech reads as "mixed".
    renderList({ checked: false, indeterminate: true });
    const all = screen.getByLabelText("(Select All)");
    expect(all).toHaveProperty("checked", false);
    expect(all).toHaveProperty("indeterminate", true);
  });

  it("reports the new state when toggled", () => {
    const toggles: boolean[] = [];
    renderList({
      checked: false,
      indeterminate: false,
      onToggle: (on) => toggles.push(on),
    });
    fireEvent.click(screen.getByLabelText("(Select All)"));
    expect(toggles).toEqual([true]);
  });

  it("ticks a mixed select-all rather than clearing it", () => {
    // Excel's behaviour: from mixed, the click selects everything.
    const toggles: boolean[] = [];
    renderList({
      checked: false,
      indeterminate: true,
      onToggle: (on) => toggles.push(on),
    });
    fireEvent.click(screen.getByLabelText("(Select All)"));
    expect(toggles).toEqual([true]);
  });

  it("is left out of a radio group", () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <FilterOptionList
          options={options}
          selected={[]}
          onToggle={() => {}}
          multiple={false}
          selectAll={{
            checked: true,
            indeterminate: false,
            onToggle: () => {},
          }}
        />
      </FluentProvider>,
    );
    expect(screen.queryByLabelText("(Select All)")).toBeNull();
  });
});

describe("addressing rows and cells", () => {
  // The grid is one flat CSS grid — no table, and the row wrapper is
  // `display: contents`, so it's not in the accessibility tree either. Data
  // attributes are the only handle a test or a stylesheet gets.
  it("names every body cell by column and row index", () => {
    render(<Harness columns={plainColumns} />);
    const kinds = Array.from(
      document.querySelectorAll('[data-column="Kind"][data-row-index]'),
    );
    expect(kinds.map((c) => c.textContent)).toEqual(["doc", "img", "doc"]);
    expect(kinds.map((c) => c.getAttribute("data-row-index"))).toEqual([
      "0",
      "1",
      "2",
    ]);
  });

  it("names header cells by column, without a row index", () => {
    render(<Harness columns={plainColumns} />);
    const header = document.querySelector(
      '[data-column="Kind"]:not([data-row-index])',
    );
    expect(header?.textContent).toContain("Kind");
    expect(header?.className).toContain(fluentDataGridClassNames.headerCell);
  });

  it("finds one cell from a row key and a column", () => {
    // The query this whole change exists for.
    const selected = newControl<string[]>([]);
    render(<SelectableHarness selected={selected} />);
    const cell = document.querySelector(
      '[data-row-key="logo"] [data-column="Kind"]',
    );
    expect(cell?.textContent).toBe("img");
  });

  it("keys rows by the caller's rowKey, and indexes them too", () => {
    const selected = newControl<string[]>([]);
    render(<SelectableHarness selected={selected} />);
    const wrappers = Array.from(
      document.querySelectorAll(`.${fluentDataGridClassNames.row}`),
    );
    expect(wrappers.map((r) => r.getAttribute("data-row-key"))).toEqual([
      "notes",
      "logo",
      "readme",
    ]);
    expect(wrappers.map((r) => r.getAttribute("data-row-index"))).toEqual([
      "0",
      "1",
      "2",
    ]);
  });

  it("falls back to the index when there is no rowKey", () => {
    const selected = newControl<string[]>([]);
    render(<SelectableHarness selected={selected} noRowKey />);
    const wrappers = Array.from(
      document.querySelectorAll(`.${fluentDataGridClassNames.row}`),
    );
    expect(wrappers.map((r) => r.getAttribute("data-row-key"))).toEqual([
      "0",
      "1",
      "2",
    ]);
  });

  it("lets the row checkbox be labelled per row", () => {
    // The default labels every row "Select row", so `getByLabelText` is
    // ambiguous the moment there's more than one.
    const selected = newControl<string[]>([]);
    render(
      <SelectableHarness
        selected={selected}
        rowAriaLabel={(r) => `Select ${r.file}`}
      />,
    );
    fireEvent.click(screen.getByLabelText("Select logo"));
    expect(selected.value).toEqual(["logo"]);
  });

  it("still accepts a constant row label", () => {
    const selected = newControl<string[]>([]);
    render(<SelectableHarness selected={selected} rowAriaLabel="Pick" />);
    expect(screen.getAllByLabelText("Pick")).toHaveLength(3);
  });
});
