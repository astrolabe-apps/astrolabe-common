import { Field, SearchBox, type SearchBoxProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";

export interface FSearchProps extends Omit<SearchBoxProps, "value" | "onChange"> {
  control: Control<string | null | undefined>;
  label?: string;
}

export function FSearch({ control, label, ...rest }: FSearchProps) {
  const value = control.value ?? "";
  return (
    <Field label={label}>
      <SearchBox
        value={value}
        onChange={(_, data) => {
          control.value = data.value;
        }}
        disabled={control.disabled}
        {...rest}
      />
    </Field>
  );
}
