import { SearchBox, type SearchBoxProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";

export interface CSearchBoxProps
  extends Omit<SearchBoxProps, "value" | "onChange"> {
  control: Control<string | null | undefined>;
}

/** Binds a control to a FluentUI `SearchBox`; no label/validation UI. */
export function CSearchBox({ control, ...rest }: CSearchBoxProps) {
  const { disabled, readOnly } = useControlEdit(control, true);
  return (
    <SearchBox
      value={control.value ?? ""}
      onChange={(_, data) => {
        control.value = data.value;
      }}
      onBlur={() => {
        control.touched = true;
      }}
      {...rest}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}

export interface FSearchBoxProps
  extends CSearchBoxProps,
    Pick<FFieldProps, "label" | "required" | "hint"> {}

/** {@link CSearchBox} wrapped in {@link FField} for label + validation. */
export function FSearchBox({
  control,
  label,
  required,
  hint,
  ...rest
}: FSearchBoxProps) {
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CSearchBox control={control} {...rest} />
    </FField>
  );
}
