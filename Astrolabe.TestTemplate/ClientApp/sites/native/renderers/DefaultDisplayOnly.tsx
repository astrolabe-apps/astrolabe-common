import { Control } from '@react-typed-forms/core';
import { rendererClass, SchemaField, SchemaInterface } from '@react-typed-forms/schemas';
import { StyleProp, View, ViewStyle } from 'react-native';

export function DefaultDisplayOnly({
  control,
  className,
  emptyText,
  schemaInterface,
  field,
  style,
}: {
  control: Control<any>;
  field: SchemaField;
  schemaInterface: SchemaInterface;
  className?: string | null;
  style?: React.CSSProperties;
  emptyText?: string | null;
}) {
  const v = control.value;
  const text =
    (schemaInterface.isEmptyValue(field, v) ? emptyText : schemaInterface.textValue(field, v)) ??
    '';
  return (
    <View style={style as StyleProp<ViewStyle>} className={rendererClass(className)}>
      {text}
    </View>
  );
}
