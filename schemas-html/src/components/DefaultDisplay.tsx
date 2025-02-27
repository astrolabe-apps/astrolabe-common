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
  const { I, Div, Span, B, H1 } = renderer.html;
  switch (data.type) {
    case DisplayDataType.Icon:
      return (
        <I
          style={style}
          className={clsx(
            getOverrideClass(className),
            display ? display.value : (data as IconDisplay).iconClass,
          )}
        />
      );
    case DisplayDataType.Text:
      return (
        <Div
          style={style}
          className={rendererClass(className, options.textClassName)}
        >
          <Span>
            {display
              ? coerceToString(display.value)
              : (data as TextDisplay).text}
          </Span>
        </Div>
      );
    case DisplayDataType.Html:
      return (
        <Div
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
        <Div>
          <B>({(data as CustomDisplay).customId})</B>
        </Div>
      );
    default:
      return <H1>Unknown display type: {data.type}</H1>;
  }
}
