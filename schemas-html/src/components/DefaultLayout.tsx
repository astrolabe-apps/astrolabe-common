import React, { ReactNode } from "react";
import {
  createLayoutRenderer,
  RenderedLayout,
  rendererClass,
  renderLayoutParts,
} from "@react-typed-forms/schemas";
import { FormRenderer } from "@react-typed-forms/schemas/lib";

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
    const h = React.createElement;
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
  renderer,
  renderError = (e) =>
    e && renderer.html("div", { className: errorClass, children: e }),
  layout: { controlEnd, controlStart, label, children, errorControl },
}: DefaultLayoutRendererOptions & {
  layout: RenderedLayout;
  renderer: FormRenderer;
}) {
  const ec = errorControl;
  const errorText = ec && ec.touched ? ec.error : undefined;
  const h = React.createElement;
  const Fragment = "Fragment";
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
