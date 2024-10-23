import {
  Control,
  formControlProps,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { Input } from "../ui/input";
import { FieldType } from "@react-typed-forms/schemas";

export function ControlInput({
  control,
  convert,
  className,
}: React.InputHTMLAttributes<HTMLInputElement> & {
  control: Control<any>;
  convert: InputConversion;
}) {
  const { errorText, value, onChange, onBlur, disabled } =
    formControlProps(control);
  const textValue = useControl(() => toText(value));
  useControlEffect(
    () => control.value,
    (v) => (textValue.value = toText(v)),
  );
  return (
    <Input
      value={textValue.value as string}
      className={className}
      onChangeText={(e) => {
        textValue.value = e;
        const converted = convert[1](e);
        if (converted !== undefined) control.value = converted;
      }}
      editable={!disabled}
    />
  );

  function toText(value: any) {
    return value == null ? "" : convert[2](value);
  }
}

type InputConversion = [
  string,
  (s: string) => any,
  (a: any) => string | number,
];

export function createInputConversion(ft: string): InputConversion {
  switch (ft) {
    case FieldType.String:
      return ["text", (a) => a, (a) => a];
    case FieldType.Bool:
      return [
        "text",
        (a) => (a === "true" ? true : a === "false" ? false : undefined),
        (a) => a?.toString() ?? "",
      ];
    case FieldType.Int:
      return [
        "number",
        (a) => (a !== "" ? parseInt(a) : null),
        (a) => (a == null ? "" : a),
      ];
    case FieldType.DateTime:
      return ["datetime-local", (a) => (!a ? null : a), (a) => a];
    case FieldType.Date:
      return ["date", (a) => (!a ? null : a), (a) => a];
    case FieldType.Time:
      return [
        "time",
        (a) => {
          const l = a.length;
          if (l === 5) return a + ":00";
          if (l === 8) return a;
          return undefined;
        },
        (a) => (a ? a.substring(0, 5) : ""),
      ];
    case FieldType.Double:
      return [
        "number",
        (a) => (a !== "" ? parseFloat(a) : null),
        (a) => (a == null ? "" : a),
      ];
    default:
      return ["text", (a) => a, (a) => a];
  }
}
