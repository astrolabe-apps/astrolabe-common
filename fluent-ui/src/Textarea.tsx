import { Textarea, type TextareaProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";

export interface CTextareaProps
  extends Omit<TextareaProps, "value" | "onChange"> {
  control: Control<string | null | undefined>;
}

/** Binds a control to a FluentUI `Textarea`; no label/validation UI. */
export function CTextarea({ control, ...rest }: CTextareaProps) {
  const { disabled, readOnly } = useControlEdit(control, true);
  return (
    <Textarea
      value={control.value ?? ""}
      onChange={(_, data) => {
        control.value = data.value;
      }}
      onBlur={() => {
        control.touched = true;
      }}
      disabled={disabled}
      readOnly={readOnly}
      {...rest}
    />
  );
}

export interface FTextareaProps
  extends CTextareaProps,
    Pick<FFieldProps, "label" | "required" | "hint"> {}

/** {@link CTextarea} wrapped in {@link FField} for label + validation. */
export function FTextarea({
  control,
  label,
  required,
  hint,
  ...rest
}: FTextareaProps) {
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CTextarea control={control} {...rest} />
    </FField>
  );
}
