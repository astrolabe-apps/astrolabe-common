import {
  createDataRenderer,
  DataRenderType,
  DateComparison,
  DateTimeRenderOptions,
  DateValidator,
  FieldType,
  isDateTimeRenderer,
  rendererClass,
  ValidatorType,
} from "@react-typed-forms/schemas";
import { CalendarProps, DatePicker } from "@astroapps/aria-datepicker";
import React from "react";
import { Control } from "@react-typed-forms/core";
import {
  CalendarDateTime,
  getLocalTimeZone,
  parseAbsolute,
  parseDate,
  toCalendarDate,
  toCalendarDateTime,
  today,
  toZoned,
} from "@internationalized/date";
import { DatePickerClasses } from "@astroapps/aria-datepicker/lib";

export const DefaultDatePickerClass =
  "flex border border-black w-full pl-3 py-2 space-x-4";

export interface DatePickerOptions
  extends DatePickerClasses,
    Pick<
      CalendarProps,
      "headerMode" | "minDate" | "maxDate" | "defaultYearRange"
    > {
  portalContainer?: Element;
}

export function createDatePickerRenderer(
  className: string = DefaultDatePickerClass,
  pickerOptions?: DatePickerOptions,
) {
  return createDataRenderer(
    (p) => {
      const dateValidators = p.definition.validators?.filter(
        (x) => x.type === ValidatorType.Date,
      ) as DateValidator[] | undefined;
      const minDateValidator = dateValidators?.find(
        (x) => x.comparison === DateComparison.NotBefore,
      );
      const maxDateValidator = dateValidators?.find(
        (x) => x.comparison === DateComparison.NotAfter,
      );
      const minDate = minDateValidator
        ? getMinOrMaxDate(minDateValidator)
        : pickerOptions?.minDate;

      const maxDate = maxDateValidator
        ? getMinOrMaxDate(maxDateValidator)
        : pickerOptions?.maxDate;

      return (
        <DatePickerRenderer
          dateTime={p.field.type == FieldType.DateTime}
          pickerOptions={{
            ...pickerOptions,
            minDate: minDate,
            maxDate: maxDate,
          }}
          className={rendererClass(p.className, className)}
          control={p.control.as()}
          readonly={p.readonly}
          designMode={p.designMode}
          options={p.renderOptions as DateTimeRenderOptions}
        />
      );
    },
    {
      schemaType: [FieldType.Date, FieldType.DateTime],
      renderType: DataRenderType.DateTime,
      match: (p, renderOptions) =>
        !isDateTimeRenderer(renderOptions) || !renderOptions.forceStandard,
    },
  );
}

function getMinOrMaxDate(dateValidator: DateValidator): string {
  const { fixedDate, daysFromCurrent } = dateValidator;
  if (fixedDate) return fixedDate;

  const daysOffset = daysFromCurrent ?? 0;
  const date = today(getLocalTimeZone());
  return date.add({ days: daysOffset }).toString();
}

function DatePickerRenderer({
  dateTime,
  className,
  id,
  control,
  readonly,
  designMode,
  options = {},
  pickerOptions,
}: {
  control: Control<string | null>;
  className?: string;
  readonly?: boolean;
  designMode?: boolean;
  id?: string;
  dateTime?: boolean;
  options?: Omit<DateTimeRenderOptions, "type">;
  pickerOptions?: DatePickerOptions;
}) {
  const {
    portalContainer,
    headerMode,
    minDate,
    maxDate,
    defaultYearRange,
    ...classes
  } = pickerOptions ?? {};
  const disabled = control.disabled;
  let dateValue: CalendarDateTime | null = null;
  try {
    dateValue = !control.value
      ? null
      : dateTime
        ? toCalendarDateTime(parseAbsolute(control.value, getLocalTimeZone()))
        : toCalendarDateTime(parseDate(control.value));
  } catch (e) {
    console.log(e);
  }

  return (
    <DatePicker
      {...classes}
      className={className}
      portalContainer={portalContainer}
      isDisabled={disabled}
      isReadOnly={readonly}
      value={dateValue}
      label={"FIXME"}
      headerMode={headerMode}
      minDate={minDate}
      maxDate={maxDate}
      defaultYearRange={defaultYearRange}
      granularity={dateTime && !options.forceMidnight ? "minute" : "day"}
      designMode={designMode}
      onChange={(c) => {
        control.touched = true;
        control.value = c
          ? dateTime
            ? toZoned(c, getLocalTimeZone()).toAbsoluteString()
            : toCalendarDate(c).toString()
          : null;
      }}
    />
  );
}
