import { Control, formControlProps, useControl, useControlEffect } from '@react-typed-forms/core';
import { TextInput } from 'react-native';

export function ControlInput({
  control,
  convert,
  className,
}: React.InputHTMLAttributes<HTMLInputElement> & {
  control: Control<any>;
  convert: InputConversion;
}) {
  const { errorText, value, onChange, onBlur, disabled } = formControlProps(control);
  const textValue = useControl(() => toText(value));
  useControlEffect(
    () => control.value,
    (v) => (textValue.value = toText(v))
  );
  return (
    <TextInput
      value={textValue.value as string}
      className={className}
      onChangeText={(e) => {
        textValue.value = e;
        const converted = convert[1](e);
        if (converted !== undefined) control.value = converted;
      }}
    />
  );

  function toText(value: any) {
    return value == null ? '' : convert[2](value);
  }
}

type InputConversion = [string, (s: string) => any, (a: any) => string | number];