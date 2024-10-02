import React from 'react';
import clsx from 'clsx';
import {
  CustomDisplay,
  DisplayDataType,
  DisplayRendererProps,
  DisplayRendererRegistration,
  getOverrideClass,
  HtmlDisplay,
  IconDisplay,
  rendererClass,
  TextDisplay,
} from '@react-typed-forms/schemas';
import { StyleSheet } from 'react-native';
import { StyleProp, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import HTMLView from 'react-native-htmlview';

export interface DefaultDisplayRendererOptions {
  textClassName?: string;
  htmlClassName?: string;
}

export function createDefaultDisplayRenderer(
  options: DefaultDisplayRendererOptions = {}
): DisplayRendererRegistration {
  return {
    render: (props) => <DefaultDisplay {...options} {...props} />,
    type: 'display',
  };
}

export function DefaultDisplay({
  data,
  display,
  className,
  style,
  ...options
}: DefaultDisplayRendererOptions & DisplayRendererProps) {
  const { width } = useWindowDimensions();
  switch (data.type) {
    case DisplayDataType.Icon:
      return (
        <i
          style={style}
          className={clsx(
            getOverrideClass(className),
            display ? display.value : (data as IconDisplay).iconClass
          )}
        />
      );
    case DisplayDataType.Text:
      return (
        <View
          style={style as StyleProp<ViewStyle>}
          className={rendererClass(className, options.textClassName)}
        >
          <Text>{display ? display.value : (data as TextDisplay).text}</Text>
        </View>
      );
    case DisplayDataType.Html:
      return (
        <HTMLView
          value={display ? (display.value ?? '') : (data as HtmlDisplay).html}
          stylesheet={styles}
        />
      );
    case DisplayDataType.Custom:
      return <Text>Custom display placeholder: {(data as CustomDisplay).customId}</Text>;
    default:
      return <Text>Unknown display type: {data.type}</Text>;
  }
}

const styles = StyleSheet.create({
  p: {
    fontWeight: '400',
    marginBottom: 10,
  },
});
