import React from "react";
import { Button } from "react-aria-components";
import clsx from "clsx";
import type { Control } from "@react-typed-forms/core";
import type { SearchRequest } from "@astroapps/searchstate";
import { pageInfo, type GridData } from "@astroapps/datagrid-search";
import { ariaDataGridClassNames, type AriaDataGridParts } from "./styles";
import { resolveIcons, type AriaDataGridIcons } from "./icons";

export interface AriaPagerProps<T = any> {
  state: Control<SearchRequest>;
  /** The current page, for its row count and total. */
  data: GridData<T>;
  /**
   * Offer a page-size selector with these options. `AriaDataGrid` keeps the pager
   * visible on a single page when this is set, so a size that fits every row can
   * still be changed back.
   */
  pageSizes?: number[];
  /** Overrides the "1-10 of 42" text. `total` is undefined when uncounted. */
  renderRange?: (from: number, to: number, total: number | undefined) => string;
  parts: AriaDataGridParts;
  icons?: AriaDataGridIcons;
}

/**
 * Prev/next paging over `offset`/`length`.
 *
 * Copes with an uncounted source: without a total it shows "1-10" instead of
 * "1-10 of 42" and infers Next from the page being full (see `pageInfo`).
 */
export function AriaPager<T = any>({
  state,
  data,
  pageSizes,
  renderRange,
  parts,
  icons,
}: AriaPagerProps<T>) {
  const fields = state.fields;
  const offset = fields.offset.value;
  const length = fields.length.value;
  const resolved = resolveIcons(icons);

  const { from, to, total, hasPrevious, hasMore } = pageInfo(
    { ...state.value, offset, length },
    data,
  );

  return (
    <div className={clsx(ariaDataGridClassNames.pager, parts.pager)}>
      {pageSizes && pageSizes.length > 0 && (
        /*
          A native select, not React Aria's — that one needs a Popover and a
          ListBox to render a list this package already renders elsewhere, and the
          native element is keyboard- and screen-reader-correct with no overlay at
          all. Picking a number out of five is exactly what it's for.
        */
        <select
          className={parts.pagerPageSize}
          aria-label="Rows per page"
          value={String(length)}
          onChange={(ev) => {
            // Keep the first visible row visible rather than the page number, so
            // changing page size doesn't jump somewhere unrelated.
            const next = Number(ev.target.value);
            fields.length.value = next;
            fields.offset.value = Math.floor(offset / next) * next;
          }}
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      )}
      <span className={parts.pagerRange}>
        {renderRange
          ? renderRange(from, to, total)
          : total === undefined
            ? `${from}-${to}`
            : `${from}-${to} of ${total}`}
      </span>
      <Button
        aria-label="Previous page"
        className={parts.pagerButton}
        isDisabled={!hasPrevious}
        onPress={() => (fields.offset.value = Math.max(0, offset - length))}
      >
        {resolved.previousPage}
      </Button>
      <Button
        aria-label="Next page"
        className={parts.pagerButton}
        isDisabled={!hasMore}
        onPress={() => (fields.offset.value = offset + length)}
      >
        {resolved.nextPage}
      </Button>
    </div>
  );
}
