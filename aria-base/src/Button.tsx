import { AriaButtonProps, useButton } from "react-aria";
import React, { useRef } from "react";

export function Button({
  children,
  className,
  ...props
}: AriaButtonProps<"button"> & { className?: string }) {
  const ref = useRef(null);
  const { buttonProps } = useButton(props, ref);
  return <button {...buttonProps} className={className} children={children} />;
}
