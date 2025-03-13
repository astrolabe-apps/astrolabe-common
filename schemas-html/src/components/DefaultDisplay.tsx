import React from "react";
import clsx from "clsx";
import {
  coerceToString,
  CustomDisplay,
  DisplayDataType,
  DisplayRendererProps,
  DisplayRendererRegistration,
  FormRenderer,
  getOverrideClass,
  HtmlDisplay,
  IconDisplay,
  rendererClass,
  TextDisplay,
} from "@react-typed-forms/schemas";

export interface DefaultDisplayRendererOptions {
  textClassName?: string;
  textTextClass?: string;
  htmlClassName?: string;
}

export function createDefaultDisplayRenderer(
  options: DefaultDisplayRendererOptions = {},
): DisplayRendererRegistration {
  return {
    render: (props, renderer) => (
      <DefaultDisplay
        options={options}
        displayProps={props}
        renderer={renderer}
      />
    ),
    type: "display",
  };
}

export function DefaultDisplay({
  renderer,
  options,
  displayProps,
}: {
  displayProps: DisplayRendererProps;
  options: DefaultDisplayRendererOptions;
  renderer: FormRenderer;
}) {
  const { data, display, className, textClass, style } = displayProps;
  const { I, Div, B, H1 } = renderer.html;
  switch (data.type) {
    case DisplayDataType.Icon:
      const iconDisplay = data as IconDisplay;
      return (
        <I
          style={style}
          className={clsx(
            getOverrideClass(className),
            display ? display.value : iconDisplay.iconClass,
          )}
          iconName={display ? display.value : iconDisplay.icon?.name}
          iconLibrary={iconDisplay.icon?.library}
        />
      );
    case DisplayDataType.Text:
      return (
        <Div
          style={style}
          className={rendererClass(className, options.textClassName)}
          textClass={rendererClass(textClass, options.textTextClass)}
          text={
            display ? coerceToString(display.value) : (data as TextDisplay).text
          }
        />
      );
    case DisplayDataType.Html:
      return (
        <Div
          style={style}
          className={rendererClass(className, options.htmlClassName)}
          html={
            display ? coerceToString(display.value) : (data as HtmlDisplay).html
          }
        />
      );
    case DisplayDataType.Custom:
      return (
        <Div>
          <B>({(data as CustomDisplay).customId})</B>
        </Div>
      );
    default:
      return <H1>Unknown display type: {data.type}</H1>;
  }
}
