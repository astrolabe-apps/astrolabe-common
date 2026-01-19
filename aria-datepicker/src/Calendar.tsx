import {
  CalendarProps as AriaCalendarProps,
  useCalendar,
  useLocale,
} from "react-aria";
import { useCalendarState } from "react-stately";
import { DateValue, GregorianCalendar } from "@internationalized/date";
import React from "react";

// Reuse the Button from your component library. See below for details.
import { Button } from "@astroapps/aria-base";
import {
  CalendarGrid,
  CalendarGridClasses,
  DefaultCalendarGridClasses,
} from "./CalendarGrid";
import { MonthDropdown } from "./MonthDropdown";
import { YearDropdown, YearDropdownProps } from "./YearDropdown";

export interface CalendarClasses extends CalendarGridClasses {
  className?: string;
  headerClass?: string;
  titleClass?: string;
  navButtonClass?: string;
  navButtonContainerClass?: string;
}

export type CalendarHeaderMode =
  | "Title"
  | "MonthSelector"
  | "YearSelector"
  | "MonthAndYearSelector";

export interface CalendarProps<T extends DateValue = DateValue>
  extends AriaCalendarProps<T>,
    CalendarClasses,
    Pick<YearDropdownProps, "minDate" | "maxDate" | "defaultYearRange"> {
  prevButton?: React.ReactNode;
  nextButton?: React.ReactNode;
  headerMode?: CalendarHeaderMode;
}

export const DefaultCalendarClasses = {
  className: "p-2",
  titleClass: "text-xl font-bold",
  headerClass: "flex items-center justify-between py-2 gap-2",
  navButtonClass: "w-8 h-8",
  ...DefaultCalendarGridClasses,
} satisfies CalendarClasses;

/** Our own implementation of createCalendar to treeshake all of the others out- we don't need the Persian calendar! @see https://react-spectrum.adobe.com/internationalized/date/Calendar.html */
function createCalendar(identifier: string) {
  switch (identifier) {
    case "gregory":
      return new GregorianCalendar();
    default:
      throw new Error(`Unsupported calendar ${identifier}`);
  }
}

export function Calendar<T extends DateValue = DateValue>(
  props: CalendarProps<T>,
) {
  const {
    className,
    headerClass,
    navButtonClass,
    titleClass,
    navButtonContainerClass,
    headerMode,
    minDate,
    maxDate,
    defaultYearRange,
    ...otherProps
  } = {
    ...DefaultCalendarClasses,
    ...props,
    headerMode: props.headerMode ?? "MonthAndYearSelector",
  };
  let { locale } = useLocale();
  let state = useCalendarState({
    ...props,
    locale,
    createCalendar,
  });
  const prevButton = otherProps.prevButton;
  const nextButton = otherProps.nextButton;
  let { calendarProps, prevButtonProps, nextButtonProps, title } = useCalendar(
    props,
    state,
  );

  return (
    <div {...calendarProps} className={className}>
      <div className={headerClass}>
        <Button
          aria-label="Previous Month"
          {...prevButtonProps}
          className={navButtonClass}
        >
          {prevButton ?? <i aria-hidden className="fa fa-arrow-left" />}
        </Button>
        {headerMode === "Title" && <h2 className={titleClass}>{title}</h2>}
        {headerMode === "MonthSelector" ||
        headerMode === "MonthAndYearSelector" ? (
          <MonthDropdown state={state} />
        ) : (
          headerMode !== "Title" && (
            <h2 className={titleClass}>{title.split(" ")?.at(0)}</h2>
          )
        )}
        {headerMode === "YearSelector" ||
        headerMode === "MonthAndYearSelector" ? (
          <YearDropdown
            state={state}
            minDate={minDate}
            maxDate={maxDate}
            defaultYearRange={defaultYearRange}
          />
        ) : (
          headerMode !== "Title" && (
            <h2 className={titleClass}>{title.split(" ")?.at(1)}</h2>
          )
        )}
        <Button
          aria-label="Next Month"
          {...nextButtonProps}
          className={navButtonClass}
        >
          {nextButton ?? <i aria-hidden className="fa fa-arrow-right" />}
        </Button>
      </div>
      <CalendarGrid {...otherProps} state={state} />
    </div>
  );
}
