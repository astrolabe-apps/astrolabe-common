import React, { useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  SearchBox,
  Spinner,
  makeStyles,
  tokens,
  typographyStyles,
} from "@fluentui/react-components";
import { DismissRegular, FilterRegular } from "@fluentui/react-icons";
import { useControl } from "@react-typed-forms/core";
import type { ColumnDef } from "@astroapps/datagrid";
import {
  filterFieldOf,
  useFilterDraft,
  type FilterPopupProps,
  type GridSearch,
} from "@astroapps/datagrid-search";
import { FilterOptionList } from "./FilterOptionList";
import { fluentDataGridClassNames, type FluentDataGridParts } from "./styles";

const useStyles = makeStyles({
  surface: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    maxHeight: "320px",
    minWidth: "180px",
    maxWidth: "280px",
    // The options scroll, not the popup: the search box stays reachable at the
    // top and Clear/Apply stay put at the bottom however many values there are.
    overflow: "hidden",
    padding: tokens.spacingVerticalS,
  },
  /**
   * Fluent adds the dismiss button to the layout when the box is focused or has
   * text. The surface is shrink-to-fit, so left alone that widens the whole popup
   * the moment you click into it. A definite `width` keeps the box out of the
   * surface's intrinsic width — `0` because a percentage would resolve against a
   * width the box is itself contributing to — and `minWidth` then fills whatever
   * the options settled on. The dismiss now eats into the text area instead of
   * pushing the popup wider.
   */
  searchBox: {
    width: 0,
    // Fills the surface, with a floor so a popup of short options — years, codes —
    // doesn't leave the box too cramped to type in once the dismiss takes its
    // slot. A constant, so it can't reintroduce the jump: the same 200px whether
    // the dismiss is there or not, and only popups that *have* a search box are
    // widened by it.
    minWidth: "max(100%, 200px)",
  },
  /** The only part that scrolls. `minHeight: 0` so it can shrink below content. */
  options: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    overflowY: "auto",
    // A list of Fluent checkboxes measures 2px taller than the box it fits in —
    // `scrollHeight` comes back 2 over `clientHeight` whatever the option count,
    // rows and gaps all being whole pixels. Without this, two options that plainly
    // fit still get a scrollbar. Two pixels of padding absorb it exactly (measured;
    // 1px leaves 1 over), and read as a little breathing room around the ends.
    paddingBlock: "2px",
  },
  message: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground3,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    justifyContent: "space-between",
    flexShrink: 0,
    borderTopWidth: tokens.strokeWidthThin,
    borderTopStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    paddingTop: tokens.spacingVerticalXS,
  },
});

export interface FluentFilterPopoverProps<T, D = unknown> {
  search: GridSearch<T, D>;
  column: ColumnDef<T, D>;
  parts: FluentDataGridParts;
  /** Replaces the popup body, keeping this trigger and shell. */
  renderBody?: (props: FilterPopupProps<T>) => ReactNode;
  ariaLabel?: string;
}

/**
 * The funnel button in a header cell, and the popup it opens.
 *
 * The body is a separate component so it mounts only when the popover is open —
 * which is what makes an async option source lazy: no request until the funnel is
 * clicked, and none at all for a column nobody filters.
 */
export function FluentFilterPopover<T, D = unknown>({
  search,
  column,
  parts,
  renderBody,
  ariaLabel = "Filter",
}: FluentFilterPopoverProps<T, D>) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  // Focusable (out of tab order) so the body can put focus back on it — see the
  // Clear button.
  const surfaceRef = useRef<HTMLDivElement>(null);

  const filter = search.filterFor(column);
  if (!filter) return null;
  const field = filterFieldOf(column, filter);
  const active = search.filter.active(field);

  return (
    <Popover
      trapFocus
      open={open}
      onOpenChange={(_, d) => setOpen(d.open)}
      positioning="below-start"
    >
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="transparent"
          size="small"
          aria-label={
            active ? `${ariaLabel} (${column.title}, filtered)` : ariaLabel
          }
          className={clsx(
            fluentDataGridClassNames.filterButton,
            parts.filterButton,
          )}
          icon={
            <FilterRegular
              className={active ? parts.filterButtonActive : undefined}
            />
          }
        />
      </PopoverTrigger>
      <PopoverSurface ref={surfaceRef} tabIndex={-1} className={styles.surface}>
        <FilterPopoverBody
          search={search}
          column={column}
          field={field}
          renderBody={renderBody}
          close={() => setOpen(false)}
          surfaceRef={surfaceRef}
        />
      </PopoverSurface>
    </Popover>
  );
}

function FilterPopoverBody<T, D>({
  search,
  column,
  field,
  renderBody,
  close,
  surfaceRef,
}: {
  search: GridSearch<T, D>;
  column: ColumnDef<T, D>;
  field: string;
  renderBody?: (props: FilterPopupProps<T>) => ReactNode;
  close: () => void;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
}) {
  const styles = useStyles();
  const filter = search.filterFor(column)!;
  const options = search.useFilterOptions(column);
  const searchText = useControl("");
  // Immediately or on Apply, depending on the grid's `deferApply` — the list and
  // the footer below just read `values` and call these.
  const draft = useFilterDraft({ filter, field, gridFilter: search.filter });
  const values = draft.values;

  const props: FilterPopupProps<T> = {
    column: column as ColumnDef<T, any>,
    field,
    // The real control, not the draft: a custom body has `close()` and decides
    // for itself when a selection is final, so deferring behind its back would
    // silently swallow the write it makes before closing.
    selected: search.filter.selected(field),
    values: search.filter.values(field),
    options,
    search: searchText,
    close,
  };

  const custom = renderBody?.(props) ?? filter.render?.(props);
  if (custom !== undefined && custom !== null) return <>{custom}</>;

  const searchable = filter.searchable ?? options.options.length > 12;
  const needle = searchText.value.toLowerCase();
  const visible = needle
    ? options.options.filter((o) =>
        (o.label ?? o.value).toLowerCase().includes(needle),
      )
    : options.options;

  return (
    <>
      {searchable && (
        <SearchBox
          size="small"
          className={styles.searchBox}
          placeholder="Search"
          value={searchText.value}
          onChange={(_, d) => (searchText.value = d.value)}
        />
      )}
      <div className={styles.options}>
        {options.loading && options.options.length === 0 ? (
          <span className={styles.message}>
            <Spinner size="tiny" /> Loading
          </span>
        ) : options.error ? (
          <span className={styles.message}>Couldn&apos;t load values</span>
        ) : visible.length === 0 ? (
          <span className={styles.message}>
            {needle ? "No matches" : "No values"}
          </span>
        ) : (
          <FilterOptionList
            options={visible}
            selected={values}
            multiple={filter.multiple ?? true}
            showCounts={filter.showCounts}
            onToggle={draft.toggle}
          />
        )}
      </div>
      {/*
        The footer itself is always there — disabled rather than absent, so the
        popup doesn't resize as the first option is ticked.

        Apply only exists where there's something to apply. Immediate mode has
        already written every click, so a button there would either be a no-op or
        imply the clicks hadn't counted yet; Escape or a click outside closes, as
        it did before any of this.
      */}
      <div className={styles.footer}>
        <Button
          appearance="subtle"
          size="small"
          icon={<DismissRegular />}
          disabled={values.length === 0}
          onClick={() => {
            draft.clear();
            // Clearing disables this button, and a disabled element can't hold
            // focus — the browser drops it to <body>, from where Escape no longer
            // reaches the popover and the only way out is a click elsewhere. Hand
            // focus back to the surface.
            surfaceRef.current?.focus();
          }}
        >
          Clear
        </Button>
        {draft.deferred && (
          <Button
            appearance="primary"
            size="small"
            onClick={() => {
              draft.apply();
              close();
            }}
          >
            Apply
          </Button>
        )}
      </div>
    </>
  );
}
