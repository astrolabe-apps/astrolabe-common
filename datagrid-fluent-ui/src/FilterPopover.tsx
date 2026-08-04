import React, { useState, type ReactNode } from "react";
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
    overflowY: "auto",
    padding: tokens.spacingVerticalS,
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
    justifyContent: "flex-end",
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
      <PopoverSurface className={styles.surface}>
        <FilterPopoverBody
          search={search}
          column={column}
          field={field}
          renderBody={renderBody}
          close={() => setOpen(false)}
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
}: {
  search: GridSearch<T, D>;
  column: ColumnDef<T, D>;
  field: string;
  renderBody?: (props: FilterPopupProps<T>) => ReactNode;
  close: () => void;
}) {
  const styles = useStyles();
  const filter = search.filterFor(column)!;
  const options = search.useFilterOptions(column);
  const searchText = useControl("");
  const values = search.filter.values(field);

  const props: FilterPopupProps<T> = {
    column: column as ColumnDef<T, any>,
    field,
    selected: search.filter.selected(field),
    values,
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
          placeholder="Search"
          value={searchText.value}
          onChange={(_, d) => (searchText.value = d.value)}
        />
      )}
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
          onToggle={(value, on) => {
            if (filter.multiple === false) {
              search.filter.setValues(field, on ? [value] : []);
            } else {
              search.filter.toggle(field, value, on);
            }
          }}
        />
      )}
      {values.length > 0 && (
        <div className={styles.footer}>
          <Button
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            onClick={() => search.filter.clear(field)}
          >
            Clear
          </Button>
        </div>
      )}
    </>
  );
}
