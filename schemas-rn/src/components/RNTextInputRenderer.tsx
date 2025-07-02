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

export function createRNTextInputRenderer(
  inputClass?: string,
  inputTextClass?: string,
) {
  return createDataRenderer(
    (p) => {
      const { renderOptions, control, readonly, ...rest } = p;
      const { disabled } = formControlProps(control);
      const { placeholder, multiline } =
        renderOptions as TextfieldRenderOptions;

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
        />
      );
    },
    {
      renderType: DataRenderType.Textfield,
    },
  );
}

export const RNTextInput = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  TextInputProps & { disabled?: boolean }
>(({ className, placeholderClassName, ...props }, ref) => {
  const editable = !props.disabled;
  const readonly = props.readOnly ? true : undefined;

  return (
    <TextInput
      ref={ref}
      {...props}
      className={cn(
        "web:flex web:h-10 native:min-h-[54px] web:w-full rounded-md border bg-background px-3 web:py-2 native:py-[6px] text-base lg:text-sm native:text-lg native:leading-[1.25] text-foreground placeholder:text-muted-foreground web:ring-offset-background file:border-0 file:bg-transparent file:font-medium web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2",
        !editable && "opacity-50 web:cursor-not-allowed",
        className,
      )}
      placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
      editable={editable}
      readOnly={readonly}
    />
  );
});

RNTextInput.displayName = "RNInput";
