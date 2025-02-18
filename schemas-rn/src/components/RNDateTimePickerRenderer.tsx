import DateTimePickerModal, {
  DateTimePickerProps,
} from "react-native-modal-datetime-picker";

import { Pressable, View } from "react-native";
import { RNTextInput } from "./RNTextInput";
import { Control, useControl } from "@react-typed-forms/core";
import {
  createDataRenderer,
  DataRenderType,
  FieldType,
} from "@react-typed-forms/schemas";
import { DefaultDataRendererOptions } from "@react-typed-forms/schemas-html";
import {
  DateFormatter,
  fromDate,
  getLocalTimeZone,
  now,
  parseAbsolute,
  parseDate,
  parseTime,
  toCalendarDate,
  toCalendarDateTime,
  toTime,
} from "@internationalized/date";

export type RNDateTimeProps = Pick<
  DateTimePickerProps,
  "mode" | "locale" | "maximumDate" | "minimumDate" | "is24Hour"
> & {
  control: Control<string | null>;
  readonly?: boolean;
  className?: string;
};

export function createRNDateTimePickerRenderer(
  options: DefaultDataRendererOptions = {},
) {
  return createDataRenderer(
    (p) => {
      const mode =
        p.field.type == FieldType.DateTime
          ? "datetime"
          : p.field.type == FieldType.Time
            ? "time"
            : "date";

      return (
        <RNDateTimePicker
          control={p.control.as()}
          mode={mode}
          className={options.inputClass}
        />
      );
    },
    {
      schemaType: [FieldType.Date, FieldType.DateTime, FieldType.Time],
      renderType: DataRenderType.DateTime,
    },
  );
}

function RNDateTimePicker({
  control,
  mode,
  locale = "en-AU",
  is24Hour = true,
  className,
  ...props
}: RNDateTimeProps) {
  const disabled = control.disabled;
  const { maximumDate, minimumDate } = props;
  const isVisible = useControl(false);

  const innerPickerValue = getInnerPickerValue();
  const formattedDate = getFormattedDate();

  const handleConfirm = (date: Date) => {
    control.touched = true;
    const zonedDateTime = fromDate(date, getLocalTimeZone());

    try {
      switch (mode) {
        case "date":
          control.value = toCalendarDate(zonedDateTime).toString();
          break;
        case "datetime":
          control.value = zonedDateTime.toAbsoluteString();
          break;
        case "time":
          control.value = toTime(zonedDateTime).toString();
          break;
      }
    } catch (_) {}
    hidePicker();
  };

  return (
    <View>
      <Pressable onPress={() => !disabled && (isVisible.value = true)}>
        <RNTextInput
          className={className}
          readOnly={true}
          value={formattedDate ?? ""}
        />
      </Pressable>

      <DateTimePickerModal
        date={innerPickerValue ?? new Date()}
        is24Hour={is24Hour}
        disabled={disabled}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        isVisible={isVisible.value}
        mode={mode}
        locale={locale}
        onConfirm={handleConfirm}
        onCancel={hidePicker}
        onHide={hidePicker}
      />
    </View>
  );

  function getInnerPickerValue() {
    const dateString = control.value;
    if (!dateString) return null;
    try {
      switch (mode) {
        case "date":
          return parseDate(dateString).toDate(getLocalTimeZone());
        case "datetime":
          return parseAbsolute(dateString, getLocalTimeZone()).toDate();
        case "time":
          return toCalendarDateTime(
            now(getLocalTimeZone()),
            parseTime(dateString),
          ).toDate(getLocalTimeZone());
      }
    } catch (_) {
      return null;
    }
  }

  function getFormattedDate() {
    if (!innerPickerValue) return null;
    let options: Intl.DateTimeFormatOptions = {};

    try {
      switch (mode) {
        case "date":
          options = {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: getLocalTimeZone(),
          };
          break;

        case "datetime":
          options = {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: getLocalTimeZone(),
          };
          break;
        case "time":
          options = {
            timeStyle: "short",
            hour12: false,
            timeZone: getLocalTimeZone(),
          };
      }
    } catch (_) {
      options = {};
    }

    return new DateFormatter("en-AU", options).format(innerPickerValue);
  }

  function hidePicker() {
    isVisible.value = false;
  }
}
