import {
  ControlActionHandler,
  createGroupRenderer,
  deepMerge,
  DialogRenderOptions,
  FormRenderer,
  GroupRendererProps,
  GroupRenderType,
  rendererClass,
} from "@react-typed-forms/schemas";
import { createOverlayState, Dialog, Modal } from "@astroapps/aria-base";
import { useControl } from "@react-typed-forms/core";
import { Fragment } from "react";

export interface DefaultDialogRenderOptions {
  classes?: {
    className?: string;
    titleClass?: string;
  };
}

export const defaultDialogOptions = {
  classes: {
    className: "",
    titleClass: "text-2xl font-bold",
  },
} satisfies DefaultDialogRenderOptions;

export function createDialogRenderer(options?: DefaultDialogRenderOptions) {
  return createGroupRenderer(
    (props) => (
      <DefaultDialogRenderer
        props={props}
        options={options}
        renderOptions={props.renderOptions as DialogRenderOptions}
      />
    ),
    {
      renderType: GroupRenderType.Dialog,
    },
  );
}

export function DefaultDialogRenderer({
  props,
  renderOptions,
  options,
}: {
  props: GroupRendererProps;
  options?: DefaultDialogRenderOptions;
  renderOptions: DialogRenderOptions;
}) {
  const {
    classes: { titleClass, className },
  } = deepMerge(options as typeof defaultDialogOptions, defaultDialogOptions);
  const open = useControl(false);
  const overlayState = createOverlayState(open);

  const actionOnClick: ControlActionHandler = (action) => {
    switch (action) {
      case "closeDialog":
        return () => overlayState.close();
      case "openDialog":
        return () => overlayState.open();
    }
  };

  const dialogContent = (
    <Dialog
      title={renderOptions.title}
      titleClass={titleClass}
      className={rendererClass(props.className, className)}
    >
      {props.formNode
        .getChildNodes()
        .filter(
          (x) => !x.definition.placement || x.definition.placement === "dialog",
        )
        .map((x, i) => props.renderChild(i, x, { actionOnClick }))}
    </Dialog>
  );

  return (
    <>
      {props.designMode
        ? dialogContent
        : open.value && (
            <Modal state={overlayState} isDismissable>
              {dialogContent}
            </Modal>
          )}
      {props.formNode
        .getChildNodes()
        .filter((x) => x.definition.placement === "trigger")
        .map((x, i) => props.renderChild(i, x, { actionOnClick }))}
    </>
  );
}
