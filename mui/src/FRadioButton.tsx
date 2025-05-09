import { Control, formControlProps } from "@react-typed-forms/core";
import { FormControlLabel, FormControlLabelProps, Radio } from "@mui/material";
import React from "react";

interface FRadioButtonProps<A>
  extends Omit<FormControlLabelProps, "control" | "defaultValue"> {
  state: Control<A>;
  value: A;
  defaultValue: A;
}

export function FRadioButton<A>({
  state,
  value,
  defaultValue,
  ...props
}: FRadioButtonProps<A>) {
  const { ref, value: fValue, disabled } = formControlProps(state);
  return (
    <FormControlLabel
      control={
        <Radio
          ref={ref}
          name={"_r" + state.uniqueId}
          checked={fValue === value}
          disabled={disabled}
          onChange={(_, v) => {
            state.value = v ? value : defaultValue;
            state.touched = true;
          }}
        />
      }
      {...props}
    />
  );
}
