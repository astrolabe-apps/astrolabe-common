/**
 * Inline SVGs, so the package needs no icon library.
 *
 * Every one is overridable through `AriaDataGridIcons`, because an app that
 * already ships FontAwesome (as `astrolabe-ui` does) or Fluent's icon set
 * shouldn't have to accept a second visual language in its grid headers.
 *
 * They inherit `currentColor` and size from the class the caller puts on the
 * wrapping element, and are `aria-hidden` — every one of them sits inside a
 * control that carries its own accessible name.
 */
import React, { type ReactNode } from "react";

const svgProps = {
  viewBox: "0 0 12 12",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const ArrowUpIcon = () => (
  <svg {...svgProps}>
    <path d="M6 10V2M3 5l3-3 3 3" />
  </svg>
);

export const ArrowDownIcon = () => (
  <svg {...svgProps}>
    <path d="M6 2v8M3 7l3 3 3-3" />
  </svg>
);

/**
 * The funnel of a column with no filter applied: outline only.
 *
 * Drawn a size up from the other header icons (14px, not 12px) with the stroke
 * scaling to match, because at 12px a hairline funnel disappears against the
 * header text next to it.
 */
export const FilterIcon = () => (
  <svg {...svgProps} className="w-3.5 h-3.5">
    <path d="M1.25 2.5h9.5L7 6.75v3.5l-2-1V6.75z" />
  </svg>
);

/**
 * The same funnel filled in, for a column that *is* filtered.
 *
 * A separate shape rather than only a colour change: colour alone fails
 * WCAG 1.4.1, and on a grid with several filterable columns the filled funnel is
 * what makes "this one is narrowing your data" readable at a glance.
 */
export const FilterActiveIcon = () => (
  <svg {...svgProps} fill="currentColor" className="w-3.5 h-3.5">
    <path d="M1.25 2.5h9.5L7 6.75v3.5l-2-1V6.75z" />
  </svg>
);

export const ChevronLeftIcon = () => (
  <svg {...svgProps} className="w-3 h-3">
    <path d="M7.5 2L4 6l3.5 4" />
  </svg>
);

export const ChevronRightIcon = () => (
  <svg {...svgProps} className="w-3 h-3">
    <path d="M4.5 2L8 6l-3.5 4" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...svgProps} className="w-3 h-3 shrink-0 text-surface-500">
    <circle cx="5" cy="5" r="3.25" />
    <path d="M7.5 7.5L10.5 10.5" />
  </svg>
);

export const DismissIcon = () => (
  <svg {...svgProps} className="w-3 h-3">
    <path d="M3 3l6 6M9 3l-6 6" />
  </svg>
);

/** A tick, drawn for a checked checkbox. */
export const CheckIcon = () => (
  <svg {...svgProps} strokeWidth={2} className="w-3 h-3">
    <path d="M2.5 6.5L5 9l4.5-5.5" />
  </svg>
);

/** The dash of an indeterminate ("some of this page") checkbox. */
export const DashIcon = () => (
  <svg {...svgProps} strokeWidth={2} className="w-3 h-3">
    <path d="M2.5 6h7" />
  </svg>
);

/** Indeterminate progress, for a page or an option list still loading. */
export const SpinnerIcon = () => (
  <svg
    viewBox="0 0 12 12"
    className="w-3 h-3 shrink-0 animate-spin"
    aria-hidden
  >
    <circle
      cx="6"
      cy="6"
      r="4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeDasharray="18 10"
    />
  </svg>
);

export interface AriaDataGridIcons {
  sortAscending?: ReactNode;
  sortDescending?: ReactNode;
  filter?: ReactNode;
  /** Shown instead of `filter` on a column that has a filter applied. */
  filterActive?: ReactNode;
  previousPage?: ReactNode;
  nextPage?: ReactNode;
  search?: ReactNode;
  clear?: ReactNode;
  loading?: ReactNode;
}

export const defaultIcons: Required<AriaDataGridIcons> = {
  sortAscending: <ArrowUpIcon />,
  sortDescending: <ArrowDownIcon />,
  filter: <FilterIcon />,
  filterActive: <FilterActiveIcon />,
  previousPage: <ChevronLeftIcon />,
  nextPage: <ChevronRightIcon />,
  search: <SearchIcon />,
  clear: <DismissIcon />,
  loading: <SpinnerIcon />,
};

export function resolveIcons(
  icons: AriaDataGridIcons = {},
): Required<AriaDataGridIcons> {
  return { ...defaultIcons, ...icons };
}
