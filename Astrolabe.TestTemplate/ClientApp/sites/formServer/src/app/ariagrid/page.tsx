"use client";

/**
 * `@astroapps/datagrid-aria` beside `@astroapps/datagrid-fluent-ui`.
 *
 * Both grids are handed the *same* `GridSearch` — one state control, one data
 * source, one set of columns — so anything that differs between the two panes is
 * the renderer's doing and nothing else. Sort one, filter it, page it: the other
 * follows, because neither owns any of that.
 *
 * The client/server toggle, query debounce and server facets are demonstrated on
 * `/fluentgrid/features`; they belong to datagrid-search and behave identically
 * under either renderer, so they're not repeated here.
 */

import React, { useState } from "react";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { useControl } from "@react-typed-forms/core";
import { columnDefinitions } from "@astroapps/datagrid";
import {
  makeGridSelection,
  useClientData,
  useGridSearch,
  type GetColumnFilter,
} from "@astroapps/datagrid-search";
import {
  AriaDataGrid,
  type AriaDataGridSize,
} from "@astroapps/datagrid-aria";
import { FluentDataGrid } from "@astroapps/datagrid-fluent-ui";
import { defaultSearchOptions, type SearchRequest } from "@astroapps/searchstate";

interface FileRow {
  id: string;
  file: string;
  author: string;
  category: string;
  size: number;
}

const CATEGORIES = ["Document", "Presentation", "Video", "Spreadsheet"];
const AUTHORS = ["Max Mustermann", "Erika Mustermann", "John Doe", "Jane Doe"];

const rows: FileRow[] = Array.from({ length: 37 }, (_, i) => ({
  id: String(i + 1),
  file: `File ${String(i + 1).padStart(2, "0")}`,
  author: AUTHORS[i % AUTHORS.length],
  category: CATEGORIES[i % CATEGORIES.length],
  size: ((i * 37) % 90) + 1,
}));

const columns = columnDefinitions<FileRow>(
  { id: "file", title: "File", sortField: "file", getter: (r) => r.file },
  {
    id: "author",
    title: "Author",
    sortField: "author",
    filterField: "author",
    getter: (r) => r.author,
  },
  {
    id: "category",
    title: "Category",
    sortField: "category",
    filterField: "category",
    getter: (r) => r.category,
  },
  {
    id: "size",
    title: "Size (MB)",
    sortField: "size",
    getter: (r) => r.size,
    columnTemplate: "100px",
  },
);

/** Enough authors to cross the "show a search box" threshold in one popup. */
const getColumnFilter: GetColumnFilter<FileRow> = (column) =>
  column.filterField === "author"
    ? { searchable: true, showCounts: true }
    : column.filterField
      ? {}
      : undefined;

export default function AriaGridPage() {
  const [size, setSize] = useState<AriaDataGridSize>("md");
  const [selectable, setSelectable] = useState(true);
  const [multiSort, setMultiSort] = useState(false);
  const [deferApply, setDeferApply] = useState(false);
  const [branded, setBranded] = useState(false);

  const state = useControl<SearchRequest>({
    ...defaultSearchOptions,
    length: 10,
  });
  const selectedIds = useControl<string[]>([]);

  const data = useClientData(state, { rows, columns, getColumnFilter });
  const search = useGridSearch(state, {
    columns,
    data,
    getColumnFilter,
    deferApply,
    sort: { mode: multiSort ? "shift" : "single" },
  });

  // Page-scoped by design: tick rows, page on, and the header checkbox reflects
  // only the page you're looking at.
  const selection = selectable
    ? makeGridSelection({
        selected: selectedIds,
        rows: data.rows,
        getId: (r) => r.id,
      })
    : undefined;

  return (
    <div className="min-h-screen bg-surface-50 p-6 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-surface-900">
          datagrid-aria
        </h1>
        <p className="text-sm text-surface-600 max-w-3xl">
          Both grids below render the same <code>GridSearch</code>. Sort, filter
          or page either one and the other moves with it — the search state is
          shared, and neither renderer holds any of it.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 text-sm">
        <label className="flex items-center gap-2">
          Density
          <select
            // `appearance-auto bg-none` for the reason the grid's own page-size
            // select needs it — see `pagerPageSize` in datagrid-aria's styles.
            className="h-7 appearance-auto rounded border border-surface-300 bg-white bg-none pl-2 pr-1 py-0"
            value={size}
            onChange={(e) => setSize(e.target.value as AriaDataGridSize)}
          >
            <option value="md">md</option>
            <option value="sm">sm</option>
            <option value="xs">xs</option>
          </select>
        </label>
        <Toggle checked={selectable} onChange={setSelectable}>
          Selection column
        </Toggle>
        <Toggle checked={multiSort} onChange={setMultiSort}>
          Multi-sort (shift-click)
        </Toggle>
        <Toggle checked={deferApply} onChange={setDeferApply}>
          Filters apply on Apply
        </Toggle>
        <Toggle checked={branded} onChange={setBranded}>
          Class overrides
        </Toggle>
        <span className="ml-auto text-surface-600">
          {selectedIds.value.length} selected
        </span>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel
          title="AriaDataGrid"
          subtitle="tailwind classes, react-aria overlays"
        >
          <AriaDataGrid
            search={search}
            size={size}
            selection={selection}
            rowKey={(r) => r.id}
            pageSizes={[5, 10, 25]}
            classes={
              branded
                ? {
                    // Overrides go through tailwind-merge, so `bg-primary-700`
                    // replaces the header's default colour rather than fighting it.
                    headerCellClass:
                      "bg-primary-700 text-white font-medium uppercase tracking-wide",
                    row: "[&:hover>*]:bg-interactive-50",
                    rowSelected: "[&>*]:bg-interactive-100",
                  }
                : undefined
            }
          />
        </Panel>

        <Panel title="FluentDataGrid" subtitle="the same search, Fluent v9">
          <FluentProvider theme={webLightTheme}>
            <FluentDataGrid
              search={search}
              size={size === "md" ? "medium" : size === "sm" ? "small" : "extra-small"}
              selection={selection}
              rowKey={(r) => r.id}
              pageSizes={[5, 10, 25]}
            />
          </FluentProvider>
        </Panel>
      </div>

      <section className="rounded-lg bg-white p-4 text-sm text-surface-600">
        <h2 className="text-base font-semibold text-surface-900 mb-2">
          What to look at
        </h2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            <strong>Author</strong> has a searchable popup with counts;{" "}
            <strong>Category</strong> has a plain one;{" "}
            <strong>Size (MB)</strong> has no <code>filterField</code>, so it has
            no funnel at all.
          </li>
          <li>
            With <em>apply on Apply</em> on, ticking values writes nothing until
            you press Apply — the immediate mode has no Apply button, because
            every click has already landed.
          </li>
          <li>
            Clear is present but disabled when there's nothing to clear, so the
            popup doesn't resize as you tick the first option.
          </li>
          <li>
            The page-size selector keeps the pager on screen even when 25 rows
            per page fits everything — otherwise there'd be no way back to 5.
          </li>
          <li>
            Multi-sort shows a small priority number beside the second and later
            sorted columns. Fluent's own DataGrid is single-sort, so that badge
            is an addition rather than a copy.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-lg bg-white p-4 min-w-0">
      <div>
        <h2 className="text-base font-semibold text-surface-900">{title}</h2>
        <p className="text-xs text-surface-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}
