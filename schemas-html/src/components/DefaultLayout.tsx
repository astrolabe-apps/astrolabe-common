import React, { ReactNode } from "react";
import {
  createLayoutRenderer,
  RenderedLayout,
  rendererClass,
  renderLayoutParts,
} from "@react-typed-forms/schemas";

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
        <DefaultLayout layout={layout} {...options} />,
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
  renderError = (e) => e && <div className={errorClass}>{e}</div>,
  layout: { controlEnd, controlStart, label, children, errorControl },
}: DefaultLayoutRendererOptions & {
  layout: RenderedLayout;
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
