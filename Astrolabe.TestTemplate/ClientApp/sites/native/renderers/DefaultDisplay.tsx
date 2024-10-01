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
import { StyleProp, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import RenderHtml from 'react-native-render-html';

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
          className={rendererClass(className, options.textClassName)}>
          <Text>{display ? display.value : (data as TextDisplay).text}</Text>
        </View>
      );
    case DisplayDataType.Html:
      return (
        <RenderHtml
          contentWidth={width}
          source={{ html: display ? (display.value ?? '') : (data as HtmlDisplay).html }}
        />
      );
    case DisplayDataType.Custom:
      return <Text>Custom display placeholder: {(data as CustomDisplay).customId}</Text>;
    default:
      return <Text>Unknown display type: {data.type}</Text>;
  }
}
