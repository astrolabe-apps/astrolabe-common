import React, { ReactNode } from "react";
import {RenderedLayout} from "@react-typed-forms/schemas";

export interface DefaultLayoutRendererOptions {
  className?: string;
  errorClass?: string;
  renderError?: (errorText: string | null | undefined) => ReactNode;
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
