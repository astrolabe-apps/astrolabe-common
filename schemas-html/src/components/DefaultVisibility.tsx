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
}: VisibilityRendererProps & { renderer: FormRenderer }) {
  const v = visibility.value;
  useEffect(() => {
    if (v) {
      visibility.setValue((ex) => ({ visible: v.visible, showing: v.visible }));
    }
  }, [v?.visible]);
  const { Div } = renderer.html;
  return v?.visible ? (
    <Div className={className} style={style} ref={divRef} children={children} />
  ) : (
    <></>
  );
}
