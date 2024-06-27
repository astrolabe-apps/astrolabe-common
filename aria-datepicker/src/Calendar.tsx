import {
  CalendarProps as AriaCalendarProps,
  useCalendar,
  useLocale,
} from "react-aria";
import { useCalendarState } from "react-stately";
import { createCalendar, DateValue } from "@internationalized/date";
import React from "react";

// Reuse the Button from your component library. See below for details.
import { Button } from "@astroapps/aria-base";
import {
  CalendarGrid,
  CalendarGridClasses,
  DefaultCalendarGridClasses,
} from "./CalendarGrid";

export interface CalendarClasses extends CalendarGridClasses {
  className?: string;
  headerClass?: string;
  titleClass?: string;
  navButtonClass?: string;
}
export interface CalendarProps<T extends DateValue = DateValue>
  extends AriaCalendarProps<T>,
    CalendarClasses {}

export const DefaultCalendarClasses = {
  className: "border border-black",
  titleClass: "text-xl ml-2 font-bold",
  headerClass: "flex items-center pb-4",
  navButtonClass: "w-8 h-8",
  ...DefaultCalendarGridClasses,
} satisfies CalendarClasses;

export function Calendar<T extends DateValue = DateValue>(
  props: CalendarProps<T>,
) {
  const { className, headerClass, navButtonClass, titleClass, ...otherProps } =
    {
      ...DefaultCalendarClasses,
      ...props,
    };
  let { locale } = useLocale();
  let state = useCalendarState({
    ...props,
    locale,
    createCalendar,
  });

  let { calendarProps, prevButtonProps, nextButtonProps, title } = useCalendar(
    props,
    state,
  );

  return (
    <div {...calendarProps} className={className}>
      <div className={headerClass}>
        <h2 className={titleClass}>{title}</h2>
        <Button {...prevButtonProps} className={navButtonClass}>
          &lt;
        </Button>
        <Button {...nextButtonProps} className={navButtonClass}>
          &gt;
        </Button>
      </div>
      <CalendarGrid {...otherProps} state={state} />
    </div>
  );
}
