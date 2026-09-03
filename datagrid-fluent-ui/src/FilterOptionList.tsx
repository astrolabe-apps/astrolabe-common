import React from "react";
import {
  Checkbox,
  Radio,
  RadioGroup,
  makeStyles,
  tokens,
  typographyStyles,
} from "@fluentui/react-components";
import type { FilterOption } from "@astroapps/datagrid-search";

const useStyles = makeStyles({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  option: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  count: {
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  selectAll: {
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    paddingBottom: tokens.spacingVerticalXXS,
    marginBottom: tokens.spacingVerticalXXS,
  },
});

/** A select-all row above the options. Multi-select only. */
export interface SelectAllProps {
  /** Every option is ticked. */
  checked: boolean;
  /** Some but not all — drawn as a dash, announced as mixed. */
  indeterminate: boolean;
  onToggle(on: boolean): void;
  /** Defaults to "(Select All)", as Excel labels it. */
  label?: string;
}

export interface FilterOptionListProps {
  options: FilterOption[];
  /** Currently selected values. */
  selected: string[];
  onToggle(value: string, on: boolean): void;
  /** Radio group instead of checkboxes. Defaults to multi-select. */
  multiple?: boolean;
  /** Show per-option row counts when the source provided them. Default true. */
  showCounts?: boolean;
  /**
   * Renders a select-all as the first row. Ignored for a radio group, where
   * "all" isn't a state the control can be in.
   */
  selectAll?: SelectAllProps;
}

/**
 * The checkbox list that makes up the default filter popup body.
 *
 * Exported on its own so a custom popup can keep the standard list and just add
 * a header, a "select all", or a different empty state.
 */
export function FilterOptionList({
  options,
  selected,
  onToggle,
  multiple = true,
  showCounts = true,
  selectAll,
}: FilterOptionListProps) {
  const styles = useStyles();

  if (!multiple) {
    return (
      <RadioGroup
        className={styles.list}
        value={selected[0] ?? ""}
        onChange={(_, d) => onToggle(d.value, true)}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            label={labelFor(option, showCounts, styles.count)}
          />
        ))}
      </RadioGroup>
    );
  }

  return (
    <div className={styles.list}>
      {selectAll && (
        // A row like any other, so it scrolls with the list as Excel's does. Its
        // state is computed over whatever options are visible, so a select-all
        // under an active search covers the matches rather than the whole list.
        <Checkbox
          className={styles.selectAll}
          checked={
            selectAll.checked ? true : selectAll.indeterminate ? "mixed" : false
          }
          onChange={(_, d) => selectAll.onToggle(!!d.checked)}
          label={selectAll.label ?? "(Select All)"}
        />
      )}
      {options.map((option) => (
        <Checkbox
          key={option.value}
          checked={selected.includes(option.value)}
          disabled={option.disabled}
          onChange={(_, d) => onToggle(option.value, !!d.checked)}
          label={labelFor(option, showCounts, styles.count)}
        />
      ))}
    </div>
  );
}

function labelFor(
  option: FilterOption,
  showCounts: boolean,
  countClass: string,
) {
  const text = option.label ?? option.value;
  if (!showCounts || option.count === undefined) return text;
  return (
    <>
      {text} <span className={countClass}>({option.count})</span>
    </>
  );
}
