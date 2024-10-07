import React from "react";
import { DisplayRendererProps } from "../controlRender";
import {
  CustomDisplay,
  DisplayDataType,
  HtmlDisplay,
  IconDisplay,
  TextDisplay,
} from "../types";
import clsx from "clsx";
import { coerceToString, getOverrideClass, rendererClass } from "../util";
import { DisplayRendererRegistration } from "../renderers";

export interface DefaultDisplayRendererOptions {
  textClassName?: string;
  htmlClassName?: string;
}

export function createDefaultDisplayRenderer(
  options: DefaultDisplayRendererOptions = {},
): DisplayRendererRegistration {
  return {
    render: (props) => <DefaultDisplay {...options} {...props} />,
    type: "display",
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
            display ? display.value : (data as IconDisplay).iconClass,
          )}
        />
      );
    case DisplayDataType.Text:
      return (
        <div
          style={style}
          className={rendererClass(className, options.textClassName)}
        >
          {display ? coerceToString(display.value) : (data as TextDisplay).text}
        </div>
      );
    case DisplayDataType.Html:
      return (
        <div
          style={style}
          className={rendererClass(className, options.htmlClassName)}
          dangerouslySetInnerHTML={{
            __html: display
              ? coerceToString(display.value)
              : (data as HtmlDisplay).html,
          }}
        />
      );
    case DisplayDataType.Custom:
      return (
        <div>
          Custom display placeholder: {(data as CustomDisplay).customId}
        </div>
      );
    default:
      return <h1>Unknown display type: {data.type}</h1>;
  }
}
