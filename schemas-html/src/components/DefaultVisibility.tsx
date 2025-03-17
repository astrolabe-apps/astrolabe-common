import {
  createVisibilityRenderer,
  VisibilityRendererProps,
} from "@react-typed-forms/schemas";
import { FormRenderer } from "@react-typed-forms/schemas/lib";
import React, { useEffect } from "react";

export function createDefaultVisibilityRenderer() {
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
  inline,
}: VisibilityRendererProps & { renderer: FormRenderer }) {
  const v = visibility.value;
  useEffect(() => {
    if (v) {
      visibility.setValue((ex) => ({ visible: v.visible, showing: v.visible }));
    }
  }, [v?.visible]);
  const { Div } = renderer.html;
  if (inline) return v?.visible ? children : undefined;
  return v?.visible ? (
    <Div
      className={className}
      style={style}
      nativeRef={divRef}
      children={children}
    />
  ) : (
    <></>
  );
}
