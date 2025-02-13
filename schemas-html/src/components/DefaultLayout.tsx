import {
  createLayoutRenderer,
  RenderedLayout,
  rendererClass,
  renderLayoutParts,
} from "@react-typed-forms/schemas";
import { FormRenderer } from "@react-typed-forms/schemas";
// noinspection ES6UnusedImports
import React, { createElement as h, Fragment, ReactNode } from "react";

export interface DefaultLayoutRendererOptions {
  className?: string;
  errorClass?: string;
  renderError?: (errorText: string | null | undefined) => ReactNode;
}

export function createDefaultLayoutRenderer(
  options: DefaultLayoutRendererOptions = {},
) {
  return createLayoutRenderer((props, renderers) => {
    const layout = renderLayoutParts(props, renderers);
    return {
      children: layout.wrapLayout(
        <DefaultLayout layout={layout} {...options} renderer={renderers} />,
      ),
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
  renderer: { h, renderText },
  renderError = (e) => e && <div className={errorClass}>{renderText(e)}</div>,
  layout: { controlEnd, controlStart, label, children, errorControl },
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
      {renderError(errorText)}
      {controlEnd}
    </>
  );
}
