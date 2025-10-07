import {
  createDataRenderer,
  DataRenderType,
  rendererClass,
  TextfieldRenderOptions,
} from "@react-typed-forms/schemas";
import { cn } from "../utils";
import { formControlProps } from "@react-typed-forms/core";
import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";

export interface ExtendedTextInput {
  keyboardType?: string;
  autoComplete?: string;
}

export function createRNTextInputRenderer(
  inputClass?: string,
  inputTextClass?: string,
) {
  return createDataRenderer(
    (p) => {
      const { renderOptions, control, readonly, ...rest } = p;
      const { disabled } = formControlProps(control);
      const { placeholder, multiline, keyboardType, autoComplete } =
        renderOptions as TextfieldRenderOptions & ExtendedTextInput;

      return (
        <RNTextInput
          {...(rest as any)}
          className={cn(
            rendererClass(p.className, inputClass),
            rendererClass(p.textClass, inputTextClass),
          )}
          disabled={disabled}
          readOnly={readonly}
          placeholder={placeholder}
          defaultValue={control.value}
          onChangeText={(v) => (control.value = v)}
          multiline={multiline}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
        />
      );
    },
    {
      renderType: DataRenderType.Textfield,
    },
  );
}

export function RNTextInput({
  className,
  placeholderClassName,
  ...props
}: TextInputProps & React.RefAttributes<TextInput> & { disabled?: boolean }) {
  const editable = !props.disabled;
  const readonly = props.readOnly ? true : undefined;

  return (
    <TextInput
      {...props}
      className={cn(
        "native:min-h-[54px] rounded-md border bg-background px-3 native:py-[6px] text-base lg:text-sm native:text-lg native:leading-[1.25] text-foreground placeholder:text-muted-foreground file:border-0 file:bg-transparent file:font-medium",
        !editable && "opacity-50",
        className,
      )}
      placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
      editable={editable}
      readOnly={readonly}
    />
  );
}

RNTextInput.displayName = "RNInput";
