import React from "react";
import {
  Button,
  Select,
  makeStyles,
  tokens,
  typographyStyles,
} from "@fluentui/react-components";
import { ChevronLeftRegular, ChevronRightRegular } from "@fluentui/react-icons";
import type { Control } from "@react-typed-forms/core";
import type { SearchOptions } from "@astroapps/searchstate";

const useStyles = makeStyles({
  pager: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground2,
  },
  range: { flexShrink: 0 },
  pageSize: { width: "auto" },
});

export interface FluentPagerProps {
  state: Control<SearchOptions>;
  /** Filtered total, from `GridData.total`. */
  total: number;
  /** Offer a page-size selector with these options. */
  pageSizes?: number[];
  /** Overrides the "1-10 of 42" text. */
  renderRange?: (from: number, to: number, total: number) => string;
}

/**
 * Prev/next paging over `offset`/`length`.
 *
 * Fluent v9 ships no pager component, so this is built from its primitives rather
 * than matching a reference implementation. Suppress it with `pager={false}` and
 * render your own if it doesn't fit.
 */
export function FluentPager({
  state,
  total,
  pageSizes,
  renderRange,
}: FluentPagerProps) {
  const styles = useStyles();
  const fields = state.fields;
  const offset = fields.offset.value;
  const length = fields.length.value;

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + length, total);
  const canPrevious = offset > 0;
  const canNext = offset + length < total;

  return (
    <div className={styles.pager}>
      {pageSizes && pageSizes.length > 0 && (
        <Select
          size="small"
          className={styles.pageSize}
          aria-label="Rows per page"
          value={String(length)}
          onChange={(_, d) => {
            // Keep the first visible row visible rather than the page number, so
            // changing page size doesn't jump somewhere unrelated.
            const next = Number(d.value);
            fields.length.value = next;
            fields.offset.value = Math.floor(offset / next) * next;
          }}
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
      )}
      <span className={styles.range}>
        {renderRange
          ? renderRange(from, to, total)
          : `${from}-${to} of ${total}`}
      </span>
      <Button
        appearance="subtle"
        size="small"
        icon={<ChevronLeftRegular />}
        aria-label="Previous page"
        disabled={!canPrevious}
        onClick={() => (fields.offset.value = Math.max(0, offset - length))}
      />
      <Button
        appearance="subtle"
        size="small"
        icon={<ChevronRightRegular />}
        aria-label="Next page"
        disabled={!canNext}
        onClick={() => (fields.offset.value = offset + length)}
      />
    </div>
  );
}
