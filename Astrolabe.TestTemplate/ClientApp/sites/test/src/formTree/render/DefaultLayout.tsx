import React, { ReactNode } from "react";
import {
  DefaultLayoutRendererOptions,
  rendererClass,
} from "@react-typed-forms/schemas";
import { FormLayoutProps } from "./index";
import { FormNodeState } from "../RenderNode";

export function createDefaultLayout(options?: DefaultLayoutRendererOptions) {
  return (props: FormLayoutProps) => (
    <RenderLayout layoutProps={props} defaults={options ?? {}} />
  );
}
export function RenderLayout({
  layoutProps: { state, children },
  defaults,
}: {
  layoutProps: FormLayoutProps;
  defaults: DefaultLayoutRendererOptions;
}): ReactNode {
  const { layoutClass, hideTitle, title, id } = state.fields;
  return (
    <div className={rendererClass(layoutClass.value, defaults.className)}>
      {!hideTitle.value && <label htmlFor={id.value}>{title.value}</label>}
      {typeof children === "function" ? children() : children}
    </div>
  );
}
