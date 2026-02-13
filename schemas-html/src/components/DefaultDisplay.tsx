import React from "react";
import clsx from "clsx";
import {
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
import { DefaultDisplayRendererOptions } from "../rendererOptions";

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
  const { data, className, textClass, style } = displayProps;
  const { I, Div, B, H1, Span } = renderer.html;
  switch (data.type) {
    case DisplayDataType.Icon:
      const iconDisplay = data as IconDisplay;
      return (
        <I
          style={style}
          className={clsx(
            getOverrideClass(className),
            iconDisplay.iconClass,
          )}
          iconName={iconDisplay.icon?.name}
          iconLibrary={iconDisplay.icon?.library}
        />
      );
    case DisplayDataType.Text:
      return (
        <Div
          style={style}
          className={rendererClass(className, options.textClassName)}
          textClass={rendererClass(textClass, options.textTextClass)}
          text={(data as TextDisplay).text}
          inline={displayProps.inline}
        />
      );
    case DisplayDataType.Html:
      return (
        <Div
          style={style}
          className={rendererClass(className, options.htmlClassName)}
          inline={displayProps.inline}
          html={(data as HtmlDisplay).html}
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
