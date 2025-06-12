import {
  ActionStyle,
  ControlActionHandler,
  createAction,
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
    containerClass?: string;
  };
}

export const defaultDialogOptions = {
  classes: {
    className: "",
    titleClass: "text-2xl font-bold",
    containerClass:
      "relative m-4 p-4 min-w-[400px] max-w-[80%] rounded-lg bg-white shadow-sm",
  },
} satisfies DefaultDialogRenderOptions;

export function createDialogRenderer(options?: DefaultDialogRenderOptions) {
  return createGroupRenderer(
    (props, renderer) => (
      <DefaultDialogRenderer
        props={props}
        options={options}
        renderer={renderer}
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
  renderer,
}: {
  props: GroupRendererProps;
  options?: DefaultDialogRenderOptions;
  renderOptions: DialogRenderOptions;
  renderer: FormRenderer;
}) {
  const {
    classes: { titleClass, className, containerClass },
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

  const triggerChildren = props.formNode
    .getChildNodes()
    .filter((x) => x.definition.placement === "trigger");
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
      {triggerChildren.map((x, i) =>
        props.renderChild(i, x, { actionOnClick }),
      )}
      {props.designMode
        ? designContent()
        : open.value && (
            <Modal
              state={overlayState}
              isDismissable
              containerClass={containerClass}
            >
              {dialogContent}
            </Modal>
          )}
    </>
  );

  function designContent() {
    return (
      <>
        <div onClickCapture={() => overlayState.toggle()}>
          {renderer.renderAction(
            createAction(
              "Toggle Dialog",
              () => {},
              open.value ? "Hide Content" : "Show Content",
              { actionStyle: ActionStyle.Link },
            ),
          )}
        </div>
        {open.value && dialogContent}
      </>
    );
  }
}
