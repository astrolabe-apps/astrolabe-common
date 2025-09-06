import DateTimePickerModal, {
  DateTimePickerProps,
} from "react-native-modal-datetime-picker";
import { Pressable, View } from "react-native";
import { RNTextInput } from "./RNTextInputRenderer";
import { Control, useControl } from "@react-typed-forms/core";
import {
  createDataRenderer,
  DataRenderType,
  FieldType,
} from "@react-typed-forms/schemas";
import { DefaultDataRendererOptions } from "../rendererOptions";
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
import { cn } from "../utils";
import { FontAwesome5 } from "@expo/vector-icons";

export type RNDateTimeProps = Pick<
  DateTimePickerProps,
  "mode" | "locale" | "maximumDate" | "minimumDate" | "is24Hour"
> & {
  control: Control<string | null>;
  readonly?: boolean;
  className?: string;
  placeholder?: string;
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
          {...p}
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

  // Fix IOS propagating
  function onPress() {
    !disabled && (isVisible.value = true);
  }

  return (
    <View>
      <Pressable
        className={"pointer-events-auto flex flex-row"}
        onPress={onPress}
      >
        <RNTextInput
          className={cn(className, "flex-1")}
          disabled={disabled}
          readOnly
          value={formattedDate ?? ""}
          placeholder={"dd/mm/yyyy"}
          onPress={onPress}
        />
        <View
          className={
            "flex flex-row bg-[#F5F5F5] size-[54px] items-center justify-center border border-[#E7E7E8]"
          }
        >
          <FontAwesome5 name={"calendar-alt"} size={20} color={"#343534"} />
        </View>
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

    return new DateFormatter(locale, options).format(innerPickerValue);
  }

  function hidePicker() {
    isVisible.value = false;
  }
}
