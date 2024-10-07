import React, { useEffect } from "react";
import clsx from "clsx";
import {
  createVisibilityRenderer,
  VisibilityRendererProps,
} from "@react-typed-forms/schemas";

export function createDefaultVisibilityRenderer() {
  return createVisibilityRenderer((props) => <DefaultVisibility {...props} />);
}

export function DefaultVisibility({
  visibility,
  children,
  className,
  style,
  divRef,
}: VisibilityRendererProps) {
  const v = visibility.value;
  useEffect(() => {
    if (v) {
      visibility.setValue((ex) => ({ visible: v.visible, showing: v.visible }));
    }
  }, [v?.visible]);
  return v?.visible ? (
    <div className={clsx(className)} style={style} ref={divRef}>
      {children}
    </div>
  ) : (
    <></>
  );
}
