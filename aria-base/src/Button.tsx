import {
  composeRenderProps,
  Button as RACButton,
  ButtonProps as RACButtonProps,
} from "react-aria-components";
import React from "react";

export function Button({
  children,
  className,
  ...props
}: RACButtonProps & { className?: string }) {
  return (
    <RACButton {...props} className={className}>
      {composeRenderProps(children, (children, { isPending }) => (
        <>{children}</>
      ))}
    </RACButton>
  );
}
