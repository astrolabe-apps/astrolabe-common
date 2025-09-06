import {
  createLayoutRenderer,
  FormRenderer,
  RenderedLayout,
  rendererClass,
  renderLayoutParts,
} from "@react-typed-forms/schemas";
import { DefaultLayoutRendererOptions } from "../rendererOptions";
import React, { ReactNode, Fragment } from "react";

export function createDefaultLayoutRenderer(
  options: DefaultLayoutRendererOptions = {},
) {
  return createLayoutRenderer((props, renderers) => {
    const layout = renderLayoutParts(props, renderers);
    return {
      children: layout.wrapLayout(
        <DefaultLayout layout={layout} {...options} renderer={renderers} />,
      ),
      inline: layout.inline,
      className: rendererClass(layout.className, options.className),
      style: layout.style,
      divRef: (e) =>
        e && props.errorControl
          ? (props.errorControl.meta.scrollElement = e)
          : undefined,
    };
  });
}

export function DefaultLayout({
  errorClass,
  renderer: {
    html: { Div, Span },
  },
  renderError = (e, errorId) =>
    e && (
      <Div>
        <Span id={errorId} className={errorClass}>
          {e}
        </Span>
      </Div>
    ),
  layout: { controlEnd, controlStart, label, children, errorControl, errorId },
}: DefaultLayoutRendererOptions & {
  layout: RenderedLayout;
  renderer: FormRenderer;
}) {
  const ec = errorControl;
  const errorText = ec && ec.touched ? ec.error : undefined;
  return (
    <>
      {label}
      {controlStart}
      {children}
      {renderError(errorText, errorId)}
      {controlEnd}
    </>
  );
}
