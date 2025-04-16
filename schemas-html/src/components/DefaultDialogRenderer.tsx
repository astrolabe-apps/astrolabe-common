import {
  ActionOptions,
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
import { useControl, useControlEffect } from "@react-typed-forms/core";
import { Fragment } from "react";

export interface DefaultDialogRenderOptions {
  classes?: {
    className?: string;
    navContainerClass?: string;
    titleClass?: string;
  };
  actions?: {
    trigger?: ActionOptions;
  };
}

export const defaultDialogOptions = {
  classes: {
    className: "",
    navContainerClass: "flex gap-2 justify-items",
    titleClass: "text-2xl font-bold",
  },
  actions: {
    trigger: {
      actionId: "open",
      actionText: "Open",
      actionStyle: null,
      icon: null,
      iconPlacement: null,
    },
  },
} satisfies DefaultDialogRenderOptions;

export function createDialogRenderer(options?: DefaultDialogRenderOptions) {
  return createGroupRenderer(
    (props, renderer) => (
      <DefaultDialogRenderer
        props={props}
        renderer={renderer}
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
  renderer,
  renderOptions,
  options,
}: {
  props: GroupRendererProps;
  renderer: FormRenderer;
  options?: DefaultDialogRenderOptions;
  renderOptions: DialogRenderOptions;
}) {
  const {
    classes: { titleClass, className, navContainerClass },
    actions: { trigger },
  } = deepMerge(options as typeof defaultDialogOptions, defaultDialogOptions);
  const {
    renderAction,
    html: { Div },
  } = renderer;
  const open = useControl(false);
  const overlayState = createOverlayState(open);
  const dialogContent = (
    <Dialog
      title={renderOptions.title}
      titleClass={titleClass}
      className={rendererClass(props.className, className)}
    >
      {props.formNode.getChildNodes().map((x, i) => props.renderChild(i, x))}
      <Div className={navContainerClass}>
        {renderOptions.actions?.map((o, i) => (
          <Fragment key={i}>{doRenderAction(o)}</Fragment>
        ))}
      </Div>
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
      {doRenderAction(trigger, () => overlayState.open())}
    </>
  );

  function doRenderAction(
    { actionText, actionId, ...action }: ActionOptions,
    onClick?: () => void,
  ) {
    const realOnClick =
      onClick ??
      props.actionOnClick?.(actionId, action.actionData, props.dataContext);
    return renderAction(
      createAction(
        actionId,
        props.designMode || !realOnClick ? () => {} : realOnClick,
        actionText,
        { ...action },
      ),
    );
  }
}
