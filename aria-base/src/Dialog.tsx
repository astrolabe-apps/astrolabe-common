import type { AriaDialogProps } from "react-aria";
import { useDialog } from "react-aria";
import React, { useRef } from "react";

export interface DialogClasses {
  className?: string;
  titleClass?: string;
}
export interface DialogProps extends AriaDialogProps, DialogClasses {
  title?: React.ReactNode;
  children: React.ReactNode;
}

export const DefaultDialogClasses: DialogClasses = {
  className: "p-8",
};
export function Dialog({ title, children, ...props }: DialogProps) {
  let ref = useRef(null);
  const { className, titleClass } = {
    ...DefaultDialogClasses,
    ...props,
  };
  let { dialogProps, titleProps } = useDialog(props, ref);

  return (
    <div {...dialogProps} ref={ref} className={className}>
      {title && (
        <h3 {...titleProps} className={titleClass}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
