// noinspection ES6UnusedImports
import React, { createElement as h } from "react";
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
  htmlClassName?: string;
}

export function createDefaultDisplayRenderer(
  options: DefaultDisplayRendererOptions = {},
): DisplayRendererRegistration {
  return {
    render: (props, renderer) => (
      <DefaultDisplay {...options} {...props} renderer={renderer} />
    ),
    type: "display",
  };
}

export function DefaultDisplay({
  data,
  display,
  className,
  style,
  renderer,
  ...options
}: DefaultDisplayRendererOptions &
  DisplayRendererProps & { renderer: FormRenderer }) {
  const h = renderer.h;
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
          <b>({(data as CustomDisplay).customId})</b>
        </div>
      );
    default:
      return <h1>Unknown display type: {data.type}</h1>;
  }
}
