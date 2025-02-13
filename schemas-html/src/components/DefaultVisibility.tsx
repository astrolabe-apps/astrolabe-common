import {
  createVisibilityRenderer,
  VisibilityRendererProps,
} from "@react-typed-forms/schemas";
import { FormRenderer } from "@react-typed-forms/schemas/lib";
import { jsx } from "react/jsx-runtime";
// noinspection ES6UnusedImports
import React, { createElement as h, Fragment, useEffect } from "react";

export function createDefaultVisibilityRenderer() {
  const h = jsx;

  return createVisibilityRenderer((props, renderer) => (
    <DefaultVisibility {...props} renderer={renderer} />
  ));
}

export function DefaultVisibility({
  visibility,
  children,
  className,
  style,
  divRef,
  renderer,
}: VisibilityRendererProps & { renderer: FormRenderer }) {
  const v = visibility.value;
  useEffect(() => {
    if (v) {
      visibility.setValue((ex) => ({ visible: v.visible, showing: v.visible }));
    }
  }, [v?.visible]);
  const h = renderer.h;
  return v?.visible ? (
    <div className={className} style={style} ref={divRef} children={children} />
  ) : (
    <></>
  );
}
