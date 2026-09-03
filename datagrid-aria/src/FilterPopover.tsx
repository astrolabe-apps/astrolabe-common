import React, { useRef, useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Input,
  Popover,
  TextField,
} from "react-aria-components";
import { mergeClasses } from "./mergeClasses";
import { useControl } from "@react-typed-forms/core";
import type { ColumnDef } from "@astroapps/datagrid";
import {
  filterFieldOf,
  useFilterDraft,
  type FilterPopupProps,
  type GridSearch,
} from "@astroapps/datagrid-search";
import { FilterOptionList } from "./FilterOptionList";
import { ariaDataGridClassNames, type AriaDataGridParts } from "./styles";
import { resolveIcons, type AriaDataGridIcons } from "./icons";

export interface AriaFilterPopoverProps<T, D = unknown> {
  search: GridSearch<T, D>;
  column: ColumnDef<T, D>;
  parts: AriaDataGridParts;
  /** Replaces the popup body, keeping this trigger and shell. */
  renderBody?: (props: FilterPopupProps<T>) => ReactNode;
  icons?: AriaDataGridIcons;
  ariaLabel?: string;
}

/**
 * The funnel button in a header cell, and the popup it opens.
 *
 * The body is a separate component so it mounts only when the popover is open —
 * which is what makes an async option source lazy: no request until the funnel is
 * clicked, and none at all for a column nobody filters. React Aria's `Popover`
 * renders nothing while closed, so that comes for free rather than needing an
 * `open &&` guard.
 */
export function AriaFilterPopover<T, D = unknown>({
  search,
  column,
  parts,
  renderBody,
  icons,
  ariaLabel = "Filter",
}: AriaFilterPopoverProps<T, D>) {
  const [open, setOpen] = useState(false);
  // Focusable (out of tab order) so the body can put focus back on it — see the
  // Clear button.
  const dialogRef = useRef<HTMLElement>(null);
  const resolved = resolveIcons(icons);

  const filter = search.filterFor(column);
  if (!filter) return null;
  const field = filterFieldOf(column, filter);
  const active = search.filter.active(field);

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        aria-label={
          // Always names the column: with several filterable columns, a bare
          // "Filter" is the same accessible name on every funnel, so neither a
          // screen reader nor `getByLabelText` can tell them apart.
          active
            ? `${ariaLabel} (${column.title}, filtered)`
            : `${ariaLabel} (${column.title})`
        }
        // Merged, not concatenated: the active colour has to beat the idle one,
        // and tailwind emits `.text-primary-600` before `.text-surface-500`.
        className={mergeClasses(
          ariaDataGridClassNames.filterButton,
          parts.filterButton,
          active && parts.filterButtonActive,
        )}
      >
        {resolved.filter}
      </Button>
      <Popover placement="bottom start" className="outline-none">
        <Dialog
          ref={dialogRef}
          // No `tabIndex` needed: React Aria's `useDialog` already renders it as
          // `tabIndex={-1}`, i.e. focusable but out of the tab order, which is
          // what the Clear button's focus handoff below relies on.
          aria-label={`${ariaLabel} ${column.title}`}
          className={mergeClasses(
            ariaDataGridClassNames.popover,
            parts.popover,
          )}
        >
          <FilterPopoverBody
            search={search}
            column={column}
            field={field}
            renderBody={renderBody}
            close={() => setOpen(false)}
            dialogRef={dialogRef}
            parts={parts}
            icons={resolved}
          />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

function FilterPopoverBody<T, D>({
  search,
  column,
  field,
  renderBody,
  close,
  dialogRef,
  parts,
  icons,
}: {
  search: GridSearch<T, D>;
  column: ColumnDef<T, D>;
  field: string;
  renderBody?: (props: FilterPopupProps<T>) => ReactNode;
  close: () => void;
  dialogRef: React.RefObject<HTMLElement | null>;
  parts: AriaDataGridParts;
  icons: Required<AriaDataGridIcons>;
}) {
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
        /*
          A plain TextField rather than React Aria's `SearchField`: that one takes
          Escape for itself to clear the text, and in here Escape is how you close
          the popup. It also ships a clear button that appears with the first
          keystroke, which would resize a shrink-to-fit popup as you type — the
          text is thrown away when the popup unmounts anyway.
        */
        <TextField
          aria-label="Search"
          value={searchText.value}
          onChange={(v) => (searchText.value = v)}
          className={parts.popoverSearch}
        >
          {icons.search}
          <Input placeholder="Search" className={parts.popoverInput} />
        </TextField>
      )}
      <div className={parts.popoverOptions}>
        {options.loading && options.options.length === 0 ? (
          <span className={parts.popoverMessage}>{icons.loading} Loading</span>
        ) : options.error ? (
          <span className={parts.popoverMessage}>
            Couldn&apos;t load values
          </span>
        ) : visible.length === 0 ? (
          <span className={parts.popoverMessage}>
            {needle ? "No matches" : "No values"}
          </span>
        ) : (
          <FilterOptionList
            options={visible}
            selected={values}
            multiple={filter.multiple ?? true}
            showCounts={filter.showCounts}
            onToggle={draft.toggle}
            parts={parts}
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
      <div className={parts.popoverFooter}>
        <Button
          isDisabled={values.length === 0}
          className={parts.popoverButton}
          onPress={() => {
            draft.clear();
            // Clearing disables this button, and a disabled element can't hold
            // focus — the browser drops it to <body>, from where Escape no longer
            // reaches the popover and the only way out is a click elsewhere. Hand
            // focus back to the dialog.
            dialogRef.current?.focus();
          }}
        >
          {icons.clear} Clear
        </Button>
        {draft.deferred && (
          <Button
            className={parts.popoverButtonPrimary}
            onPress={() => {
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
