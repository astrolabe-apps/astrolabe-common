import type { AriaPopoverProps } from "react-aria";
import { DismissButton, Overlay, usePopover } from "react-aria";
import type { OverlayTriggerState } from "react-stately";
import React, { ReactNode, useRef } from "react";
import { DOMAttributes } from "@react-types/shared";

export interface PopoverClasses {
  underlayClass?: string;
  popoverClass?: string;
}
export interface PopoverProps
  extends Omit<AriaPopoverProps, "popoverRef">,
    PopoverClasses {
  children: React.ReactNode;
  state: OverlayTriggerState;
  portalContainer?: Element;
  renderArrow?: (props: DOMAttributes) => ReactNode;
}

export const DefaultPopoverClasses = {
  underlayClass: "fixed inset-0",
  popoverClass: "bg-white",
};

export function Popover({
  children,
  state,
  renderArrow,
  portalContainer,
  ...props
}: PopoverProps) {
  let popoverRef = useRef(null);
  const { popoverClass, underlayClass } = {
    ...DefaultPopoverClasses,
    ...props,
  };
  let { popoverProps, underlayProps, arrowProps } = usePopover(
    {
      ...props,
      popoverRef,
    },
    state,
  );

  return (
    <Overlay portalContainer={portalContainer}>
      <div {...underlayProps} className={underlayClass} />
      <div
        {...popoverProps}
        ref={popoverRef}
        className={popoverClass}
        style={popoverProps.style}
      >
        {renderArrow?.(arrowProps)}
        <DismissButton onDismiss={state.close} />
        {children}
        <DismissButton onDismiss={state.close} />
      </div>
    </Overlay>
  );
}

export function createOverlayState(ref: {
  value: boolean;
}): OverlayTriggerState {
  return {
    isOpen: ref.value,
    setOpen: (o) => (ref.value = o),
    open: () => (ref.value = true),
    close: () => (ref.value = false),
    toggle: () => (ref.value = !ref.value),
  };
}
