import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
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
  AriaDataGrid,
  ariaDataGridClassNames,
  ariaDataGridClasses,
  FilterOptionList,
  makeGridSelection,
  mergeClasses,
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

const { parts } = ariaDataGridClasses();

function Harness({
  columns,
  over,
  getColumnFilter,
  pager,
  pageSizes,
  renderHeaderExtra,
  deferApply,
  state: ownedState,
}: {
  columns: ColumnDef<Row, unknown>[];
  over?: Partial<SearchRequest>;
  getColumnFilter?: GetColumnFilter<Row>;
  pager?: boolean;
  pageSizes?: number[];
  renderHeaderExtra?: (column: ColumnDef<Row, unknown>) => React.ReactNode;
  deferApply?: boolean;
  /**
   * A state control owned by the test, for asserting what an interaction wrote.
   * Without one the harness makes a fresh control per render — fine for
   * first-render assertions, useless for writes, which would land on a control
   * the next render throws away.
   */
  state?: ReturnType<typeof newControl<SearchRequest>>;
}) {
  // The tracking transform doesn't reach a component defined in a test file the
  // way it reaches the package's own sources, so tracking is installed by hand —
  // exactly what the transform would have inserted.
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
      deferApply,
    });
    return (
      <AriaDataGrid
        search={search}
        pager={pager}
        pageSizes={pageSizes}
        renderHeaderExtra={renderHeaderExtra}
      />
    );
  } finally {
    stop();
  }
}

afterEach(cleanup);

describe("a grid with nothing enabled", () => {
  // Every affordance is opt-in through column metadata, so a plain column set
  // gets a plain table.
  it("renders the rows", () => {
    render(<Harness columns={plainColumns} />);
    expect(screen.getByText("notes")).toBeDefined();
    expect(screen.getByText("readme")).toBeDefined();
  });

  it("renders no sort indication", () => {
    render(<Harness columns={plainColumns} />);
    expect(document.querySelector("[aria-sort]")).toBeNull();
    expect(
      document.querySelector(`.${ariaDataGridClassNames.sortIcon}`),
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

  it("keeps the pager on a single page when page sizes are offered", () => {
    // A size that fits every row would otherwise hide the only control that can
    // shrink it again. Prev/next are there but dead.
    render(<Harness columns={richColumns} pageSizes={[2, 10]} />);
    expect(screen.getByLabelText("Rows per page")).toBeDefined();
    expect(screen.getByLabelText("Next page")).toHaveProperty("disabled", true);
  });

  it("still suppresses the pager on request with page sizes offered", () => {
    render(<Harness columns={richColumns} pageSizes={[2, 10]} pager={false} />);
    expect(screen.queryByLabelText("Rows per page")).toBeNull();
  });

  it("reports no data without inventing rows", () => {
    render(<Harness columns={richColumns} over={{ query: "nothing" }} />);
    expect(screen.getByText("No data")).toBeDefined();
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
    const funnel = screen.getByLabelText("Filter");
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

describe("the filter popover", () => {
  /** Counts how often an async option source is consulted. */
  function countingFilter() {
    const calls = { count: 0 };
    const getColumnFilter: GetColumnFilter<Row> = (column) =>
      column.filterField
        ? {
            options: async () => {
              calls.count++;
              return [{ value: "doc" }, { value: "img" }];
            },
          }
        : undefined;
    return { calls, getColumnFilter };
  }

  /** The same values, already to hand. */
  const staticFilter: GetColumnFilter<Row> = (column) =>
    column.filterField
      ? { options: [{ value: "doc" }, { value: "img" }] }
      : undefined;

  it("asks for options only once the funnel is clicked", () => {
    // What makes an async option source lazy: React Aria's Popover renders
    // nothing while closed, so the body — and its `useFilterOptions` call — has
    // not mounted yet. No request for a column nobody filters, ever.
    const { calls, getColumnFilter } = countingFilter();
    render(<Harness columns={richColumns} getColumnFilter={getColumnFilter} />);
    expect(calls.count).toBe(0);
    fireEvent.click(screen.getByLabelText("Filter"));
    expect(calls.count).toBeGreaterThan(0);
  });

  it("lists the column's values with the standard footer", () => {
    render(<Harness columns={richColumns} getColumnFilter={staticFilter} />);
    fireEvent.click(screen.getByLabelText("Filter"));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByLabelText("doc")).toBeDefined();
    expect(screen.getByLabelText("img")).toBeDefined();
    // Always present, disabled rather than absent, so the popup doesn't resize
    // as the first option is ticked.
    expect(screen.getByRole("button", { name: /Clear/ })).toHaveProperty(
      "disabled",
      true,
    );
  });

  // These interactions are what the Fluent package can't reach: its popup body
  // calls `useControl`, which throws without the tracking transform, and its tests
  // run through ts-jest. This package's tests run the transform (babel.jest.cjs),
  // so the body renders as it does in a build.

  /** A state control the test keeps, so writes survive the next render. */
  const stateWith = (over: Partial<SearchRequest> = {}) =>
    newControl<SearchRequest>({ ...defaultSearchOptions, length: 10, ...over });

  it("writes a ticked option straight to the filter", () => {
    const state = stateWith();
    render(
      <Harness
        columns={richColumns}
        getColumnFilter={staticFilter}
        state={state}
      />,
    );
    fireEvent.click(screen.getByLabelText("Filter"));
    fireEvent.click(screen.getByLabelText("doc"));
    // Immediate mode: no Apply button, and the click has already landed.
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(state.fields.filters.value).toEqual({ kind: ["doc"] });
  });

  it("holds a tick back until Apply when the grid defers", () => {
    const state = stateWith();
    render(
      <Harness
        columns={richColumns}
        getColumnFilter={staticFilter}
        deferApply
        state={state}
      />,
    );
    fireEvent.click(screen.getByLabelText("Filter"));
    fireEvent.click(screen.getByLabelText("doc"));
    expect(state.fields.filters.value ?? {}).toEqual({});
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(state.fields.filters.value).toEqual({ kind: ["doc"] });
  });

  it("clears the column and keeps focus inside the popup", () => {
    // Clearing disables the Clear button, and a disabled element can't hold
    // focus — the browser would drop it to <body>, from where Escape no longer
    // closes the popover. The handler hands focus to the dialog instead.
    const state = stateWith({ filters: { kind: ["doc"] } });
    render(
      <Harness
        columns={richColumns}
        getColumnFilter={staticFilter}
        state={state}
      />,
    );
    fireEvent.click(screen.getByLabelText("Filter (Kind, filtered)"));
    const clear = screen.getByRole("button", { name: /Clear/ });
    expect(clear).toHaveProperty("disabled", false);
    fireEvent.click(clear);
    expect(state.fields.filters.value?.kind ?? []).toEqual([]);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("offers a search box only once there are enough options to need one", () => {
    const few: GetColumnFilter<Row> = (column) =>
      column.filterField ? { options: [{ value: "doc" }] } : undefined;
    const { unmount } = render(
      <Harness columns={richColumns} getColumnFilter={few} />,
    );
    fireEvent.click(screen.getByLabelText("Filter"));
    expect(screen.queryByLabelText("Search")).toBeNull();
    unmount();

    const many: GetColumnFilter<Row> = (column) =>
      column.filterField
        ? {
            options: Array.from({ length: 13 }, (_, i) => ({
              value: `v${i}`,
            })),
          }
        : undefined;
    render(<Harness columns={richColumns} getColumnFilter={many} />);
    fireEvent.click(screen.getByLabelText("Filter"));
    expect(screen.getByLabelText("Search")).toBeDefined();
  });

  it("narrows the options as you search, and says when nothing matches", () => {
    const many: GetColumnFilter<Row> = (column) =>
      column.filterField
        ? {
            searchable: true,
            options: [{ value: "document" }, { value: "image" }],
          }
        : undefined;
    render(<Harness columns={richColumns} getColumnFilter={many} />);
    fireEvent.click(screen.getByLabelText("Filter"));
    const box = screen.getByLabelText("Search");
    fireEvent.change(box, { target: { value: "doc" } });
    expect(screen.getByLabelText("document")).toBeDefined();
    expect(screen.queryByLabelText("image")).toBeNull();
    fireEvent.change(box, { target: { value: "zzz" } });
    expect(screen.getByText("No matches")).toBeDefined();
  });
});

describe("filter option counts", () => {
  const counted = [
    { value: "doc", count: 2 },
    { value: "img", count: 1 },
  ];

  function renderList(showCounts?: boolean) {
    render(
      <FilterOptionList
        options={counted}
        selected={[]}
        onToggle={() => {}}
        showCounts={showCounts}
        parts={parts}
      />,
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

  it("keeps the count out of the accessible name", () => {
    // The checkbox is labelled "doc", not "doc (2)": the number is data that
    // moves as the grid filters, and it isn't part of what you're ticking.
    renderList();
    expect(screen.getByLabelText("doc")).toBeDefined();
  });

  it("toggles the value a click landed on", () => {
    const onToggle = jest.fn();
    render(
      <FilterOptionList
        options={counted}
        selected={[]}
        onToggle={onToggle}
        parts={parts}
      />,
    );
    fireEvent.click(screen.getByLabelText("img"));
    expect(onToggle).toHaveBeenCalledWith("img", true);
  });
});

/** A selectable grid, with the selection held where a page would hold it. */
function SelectableHarness({
  selected,
  selectOnRowClick,
}: {
  selected: ReturnType<typeof newControl<string[]>>;
  selectOnRowClick?: boolean;
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
      <AriaDataGrid
        search={search}
        selection={selection}
        selectOnRowClick={selectOnRowClick}
        rowKey={(r) => r.file}
      />
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
    // The Fluent package asserts this through `getComputedStyle`, which works
    // because Griffel injects real CSS at runtime. Tailwind classes only become
    // CSS in a build, so here the class itself is the assertion.
    const selected = newControl<string[]>([]);
    const { unmount } = render(<SelectableHarness selected={selected} />);
    const row = () =>
      document.querySelector(`.${ariaDataGridClassNames.row}`)!.className;
    expect(row()).toContain(parts.rowClickable);
    unmount();
    render(<SelectableHarness selected={selected} selectOnRowClick={false} />);
    expect(row()).not.toContain(parts.rowClickable);
  });

  it("paints selected rows", () => {
    const selected = newControl<string[]>(["notes"]);
    render(<SelectableHarness selected={selected} />);
    const wrappers = document.querySelectorAll(
      `.${ariaDataGridClassNames.row}`,
    );
    expect(wrappers[0].className).toContain(parts.rowSelected);
    expect(wrappers[1].className).not.toContain(parts.rowSelected);
  });

  it("reports the page's mixed state on the header checkbox", () => {
    // A native input's `indeterminate` property, which is what React Aria sets and
    // what assistive tech reads as "mixed" — there's no aria-checked here.
    const selected = newControl<string[]>(["notes"]);
    render(<SelectableHarness selected={selected} />);
    const all = screen.getByLabelText(
      "Select all rows on this page",
    ) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
  });

  it("checks the header box once the whole page is selected", () => {
    const selected = newControl<string[]>(["notes", "logo", "readme"]);
    render(<SelectableHarness selected={selected} />);
    const all = screen.getByLabelText(
      "Select all rows on this page",
    ) as HTMLInputElement;
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
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
    return <AriaDataGrid search={search} />;
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
    expect(screen.getByLabelText("Next page")).toHaveProperty(
      "disabled",
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
    expect(screen.getByLabelText("Previous page")).toHaveProperty(
      "disabled",
      false,
    );
    expect(screen.getByLabelText("Next page")).toHaveProperty("disabled", true);
    expect(screen.getByText("3-3")).toBeDefined();
  });
});

describe("class overrides", () => {
  it("lets a caller's utility beat the default it conflicts with", () => {
    const { gridClasses } = ariaDataGridClasses({
      classes: { bodyCellClass: "h-20" },
    });
    // tailwind-merge drops the losing height rather than leaving both in the
    // string to fight over specificity — @astroapps/datagrid joins classes with
    // clsx, so source order wouldn't decide it.
    expect(gridClasses.bodyCellClass).toContain("h-20");
    expect(gridClasses.bodyCellClass).not.toContain("h-11");
  });

  it("keeps the stable class names alongside an override", () => {
    const { gridClasses } = ariaDataGridClasses({
      classes: { bodyCellClass: "h-20" },
    });
    expect(gridClasses.bodyCellClass).toContain(
      ariaDataGridClassNames.bodyCell,
    );
  });

  it("leaves unrelated utilities in place", () => {
    const { parts: overridden } = ariaDataGridClasses({
      classes: { row: "[&:hover>*]:bg-primary-50" },
    });
    // Only the hover background is replaced; the active state survives.
    expect(overridden.row).toContain("[&:active>*]:bg-surface-100");
  });

  it("applies the size to the body cell", () => {
    expect(
      ariaDataGridClasses({ size: "sm" }).gridClasses.bodyCellClass,
    ).toContain("h-[34px]");
    const xs = ariaDataGridClasses({ size: "xs" }).gridClasses;
    expect(xs.bodyCellClass).toContain("text-xs");
    // The denser grid drops the row divider.
    expect(xs.bodyCellClass).toContain("border-b-0");
  });

  it("keeps the header at one height across sizes", () => {
    // Fluent's header is 32px at every density, and so is this one.
    for (const size of ["md", "sm", "xs"] as const) {
      expect(
        ariaDataGridClasses({ size }).gridClasses.headerCellClass,
      ).toContain("h-8");
    }
  });

  it("lets a header-cell override reach the title inside the button", () => {
    // Tailwind's preflight resets `text-transform` on buttons, so an `uppercase`
    // put on the header cell would stop at the title — the one place it's aimed
    // at. jsdom computes no stylesheet, so the class is the assertion.
    expect(ariaDataGridClasses().parts.sortButton).toContain(
      "[text-transform:inherit]",
    );
  });

  it("marks cross-prop overrides important", () => {
    // These reach a cell through a different DataGridClasses prop than the base
    // cell does, and @astroapps/datagrid clsx-es the two together — so the
    // cascade, not this package, would pick the winner. `!` settles it.
    const { parts, gridClasses } = ariaDataGridClasses({ size: "xs" });
    expect(parts.selectionCell).toContain("!px-0");
    expect(gridClasses.bodyCellClass).toContain("!border-b-0");
  });
});

/**
 * A whole class of bug this package hit once: composing two tailwind strings with
 * `clsx` leaves both utilities in the attribute, and the winner is then whichever
 * rule tailwind emitted later. Under the astrolabe preset `.bg-primary-600` comes
 * out before `.bg-white`, so a selected checkbox stayed white — with `text-white`
 * on the tick, an invisible tick on a white box.
 *
 * Asserting a state class "is present" would have passed throughout. These assert
 * the class it has to beat is *gone*.
 */
describe("state classes actually win", () => {
  it("fills a checked checkbox", () => {
    const selected = newControl<string[]>(["notes"]);
    render(<SelectableHarness selected={selected} />);
    const box = drawnBox("Select row", 0);
    expect(box).toContain("bg-primary-600");
    expect(box).not.toContain("bg-white");
    expect(box).toContain("border-primary-600");
    expect(box).not.toContain("border-surface-400");
  });

  it("leaves an unchecked checkbox alone", () => {
    const selected = newControl<string[]>(["notes"]);
    render(<SelectableHarness selected={selected} />);
    const box = drawnBox("Select row", 1);
    expect(box).toContain("bg-white");
    expect(box).not.toContain("bg-primary-600");
  });

  it("colours an active filter funnel", () => {
    render(
      <Harness columns={richColumns} over={{ filters: { kind: ["doc"] } }} />,
    );
    const funnel = screen.getByLabelText("Filter (Kind, filtered)");
    expect(funnel.className).toContain("text-primary-600");
    expect(funnel.className).not.toContain("text-surface-500");
  });

  it("paints a selected row's hover state over the unselected one", () => {
    const selected = newControl<string[]>(["notes"]);
    render(<SelectableHarness selected={selected} />);
    const row = document.querySelectorAll(`.${ariaDataGridClassNames.row}`)[0]
      .className;
    expect(row).toContain("[&:hover>*]:bg-primary-100");
    expect(row).not.toContain("[&:hover>*]:bg-surface-50");
  });

  it("leaves no conflicting utilities anywhere it composes classes", () => {
    // The general form of the bug. `mergeClasses` is idempotent on a string with
    // no conflicts, so anything it shortens had a conflict the cascade was
    // deciding. Elements carrying an `!` are skipped: there the winner is decided
    // by importance, and the loser is meant to still be in the attribute.
    const selected = newControl<string[]>(["notes"]);
    render(<SelectableHarness selected={selected} />);
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const className = el.className;
      if (typeof className !== "string" || !className.trim()) continue;
      if (className.includes("!")) continue;
      if (mergeClasses(className) !== className) {
        offenders.push(`<${el.tagName.toLowerCase()}> ${className}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("mergeClasses", () => {
  it("lets the later utility win", () => {
    expect(mergeClasses("bg-white", "bg-primary-600")).toBe("bg-primary-600");
  });

  it("keeps a tailwind v3 focus ring intact", () => {
    // `outline` is the *style* in Tailwind v3 and the *width* in v4, which is what
    // tailwind-merge 3.x assumes. Uncorrected it reads this as two widths and
    // drops the style, leaving a 2px outline of style `none` — i.e. no focus ring
    // at all, on every part that gets merged.
    const ring = "outline outline-2 outline-secondary-600";
    expect(mergeClasses(ring)).toBe(ring);
  });

  it("still resolves genuine outline-width conflicts", () => {
    expect(mergeClasses("outline-2 outline-4")).toBe("outline-4");
  });
});

/** The span a `GridCheckbox` draws, next to its hidden input. */
function drawnBox(label: string, index: number) {
  const input = screen.getAllByLabelText(label)[index];
  const box = input.closest("label")?.querySelector("span:last-of-type");
  if (!box) throw new Error(`no drawn box for ${label}[${index}]`);
  return box.className;
}
