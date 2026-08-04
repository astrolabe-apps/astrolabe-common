import React from "react";
import {
  Button,
  Checkbox,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { FilterRegular } from "@fluentui/react-icons";
import { type Control, useComputed } from "@react-typed-forms/core";
import { type SearchFilters, setFilterValue } from "@astroapps/searchstate";

const useStyles = makeStyles({
  trigger: {
    minWidth: "20px",
    maxWidth: "20px",
    height: "20px",
    padding: 0,
    flexShrink: 0,
  },
  active: { color: tokens.colorBrandForeground1 },
  surface: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    maxHeight: "320px",
    overflowY: "auto",
    padding: tokens.spacingVerticalS,
  },
  empty: { color: tokens.colorNeutralForeground3 },
});

export interface FluentFilterPopoverProps {
  /** The column's `filterField`. */
  filterField: string;
  /** Filter state, i.e. `state.fields.filters` of a searchstate control. */
  filters: Control<SearchFilters>;
  /**
   * Distinct `[value, label]` options for the field — see `columnFilterValues`.
   * Called inside this component, so it may use hooks (e.g. to memoise over the
   * data), like the equivalent popovers elsewhere in the repo.
   */
  useFilterValues: (field: string) => [string, string][];
  /** Called after a filter changes, to reset paging. */
  onFilterChanged?: () => void;
  ariaLabel?: string;
}

/**
 * Fluent equivalent of the Radix `FilterPopover` used by `astrolabe-ui` and
 * `astrolabe-schemas-datagrid`: a filter button in the header cell opening a
 * checkbox list of the column's distinct values.
 */
export function FluentFilterPopover({
  filterField,
  filters,
  useFilterValues,
  onFilterChanged,
  ariaLabel = "Filter",
}: FluentFilterPopoverProps) {
  const styles = useStyles();
  const values = useFilterValues(filterField);
  // useComputed rather than a bare `.value` read: consumers of this package
  // can't be assumed to have the @react-typed-forms Babel/SWC transform that
  // would otherwise make the read reactive.
  const selected = useComputed(() => filters.value?.[filterField] ?? []).value;
  const anySelected = selected.length > 0;
  return (
    <Popover trapFocus>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="transparent"
          size="small"
          aria-label={ariaLabel}
          className={styles.trigger}
          icon={
            <FilterRegular
              className={anySelected ? styles.active : undefined}
            />
          }
        />
      </PopoverTrigger>
      <PopoverSurface className={styles.surface}>
        {values.length === 0 ? (
          <span className={styles.empty}>No values</span>
        ) : (
          values.map(([value, label]) => (
            <Checkbox
              key={value}
              label={label}
              checked={selected.includes(value)}
              onChange={(_, d) => {
                filters.setValue(
                  setFilterValue(filterField, value, !!d.checked),
                );
                onFilterChanged?.();
              }}
            />
          ))
        )}
      </PopoverSurface>
    </Popover>
  );
}
