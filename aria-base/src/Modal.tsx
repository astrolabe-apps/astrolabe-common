import React from "react";
import {
  AriaModalOverlayProps,
  Overlay,
  useModalOverlay,
  useOverlayTrigger,
} from "react-aria";
import {
  OverlayTriggerProps,
  OverlayTriggerState,
  useOverlayTriggerState,
} from "react-stately";
import { Dialog, DialogProps, DialogClasses } from "./Dialog";

export interface ModalClasses {
  underlayClass?: string;
  containerClass?: string;
}

export interface ModalDialogClasses extends DialogClasses, ModalClasses {}

export const DefaultModalDialogClasses: ModalDialogClasses = {
  underlayClass:
    "fixed z-[100] inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-[2px]",
  containerClass:
    "relative m-4 p-4 w-3/5 min-w-[400px] max-w-[80%] rounded-lg bg-white shadow-sm",
};

export interface ModalProps extends AriaModalOverlayProps, ModalClasses {
  state: OverlayTriggerState;
  children: React.ReactElement;
}

export interface ModalDialogTriggerProps
  extends OverlayTriggerProps,
    AriaModalOverlayProps {
  trigger: React.ReactElement;
  children: React.ReactElement;
}

export interface ModalDialogProps
  extends ModalDialogTriggerProps,
    Omit<DialogProps, "children">,
    ModalDialogClasses {
  footer?: React.ReactNode;
}

export function Modal({
  state,
  children,
  isDismissable,
  isKeyboardDismissDisabled,
  shouldCloseOnInteractOutside,
  ...props
}: ModalProps) {
  let ref = React.useRef(null);
  let { modalProps, underlayProps } = useModalOverlay(
    { isDismissable, isKeyboardDismissDisabled, shouldCloseOnInteractOutside },
    state,
    ref,
  );

  const { underlayClass, containerClass } = {
    ...DefaultModalDialogClasses,
    ...props,
  };

  return (
    <Overlay>
      <div className={underlayClass} {...underlayProps}>
        <div {...modalProps} ref={ref} className={containerClass}>
          {children}
        </div>
      </div>
    </Overlay>
  );
}

export function ModalTrigger({
  trigger,
  children,
  ...props
}: ModalDialogTriggerProps) {
  let state = useOverlayTriggerState({ ...props });
  let { triggerProps, overlayProps } = useOverlayTrigger(
    { type: "dialog" },
    state,
  );

  const { onPress, ...otherTriggerProps } = triggerProps;
  return (
    <>
      {React.cloneElement(trigger, { ...otherTriggerProps, onClick: onPress })}
      {state.isOpen && (
        <Modal state={state} {...props}>
          {React.cloneElement(children, overlayProps)}
        </Modal>
      )}
    </>
  );
}

export function ModalDialog({
  children,
  footer,
  defaultOpen = false,
  isDismissable = true,
  titleClass = "text-2xl font-bold",
  ...props
}: ModalDialogProps) {
  const { className } = {
    ...DefaultModalDialogClasses,
    ...props,
  };

  return (
    <ModalTrigger
      defaultOpen={defaultOpen}
      isDismissable={isDismissable}
      {...props}
    >
      <Dialog className={className} {...props}>
        {children}
        {footer}
      </Dialog>
    </ModalTrigger>
  );
}
