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
import { StyleProp, View, ViewStyle } from 'react-native';
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
          {display ? display.value : (data as TextDisplay).text}
        </View>
      );
    case DisplayDataType.Html:
      return (
        <RenderHtml
          source={{ html: display ? (display.value ?? '') : (data as HtmlDisplay).html }}
        />
      );
    case DisplayDataType.Custom:
      return <div>Custom display placeholder: {(data as CustomDisplay).customId}</div>;
    default:
      return <h1>Unknown display type: {data.type}</h1>;
  }
}
