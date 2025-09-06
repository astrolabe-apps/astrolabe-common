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
  DefaultDisplayRendererOptions,
} from "@react-typed-forms/schemas";

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
  const { I, Div, B, H1, Span } = renderer.html;
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
      const text = display
        ? coerceToString(display.value)
        : (data as TextDisplay).text;
      return (
        <Div
          style={style}
          className={rendererClass(className, options.textClassName)}
          textClass={rendererClass(textClass, options.textTextClass)}
          text={text}
          inline={displayProps.inline}
        />
      );
    case DisplayDataType.Html:
      return (
        <Div
          style={style}
          className={rendererClass(className, options.htmlClassName)}
          inline={displayProps.inline}
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