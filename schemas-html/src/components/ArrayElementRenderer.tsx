import {
  ActionRendererProps,
  ArrayElementRenderOptions,
  ControlDefinitionType,
  createDataRenderer,
  DataRendererProps,
  DataRenderType,
  ExternalEditAction,
  FormNode,
  FormRenderer,
  getExternalEditData,
  GroupedControlsDefinition,
  GroupRenderType,
  makeSchemaDataNode,
  nodeForControl,
  rendererClass,
  validationVisitor,
  visitFormDataInContext,
} from "@react-typed-forms/schemas";
// noinspection ES6UnusedImports
import React, { createElement as h, Fragment } from "react";
import { Dialog, Modal } from "@astroapps/aria-base";
import { useOverlayTriggerState } from "@react-stately/overlays";
import { RenderElements } from "@react-typed-forms/core";

export interface ArrayElementRendererOptions {
  className?: string;
  actionsClass?: string;
}
export function createArrayElementRenderer(
  options: ArrayElementRendererOptions = {},
) {
  return createDataRenderer(
    (props, formRenderer) => (
      <ArrayElementRenderer
        dataProps={props}
        options={options}
        formRenderer={formRenderer}
        renderOptions={props.renderOptions as ArrayElementRenderOptions}
      />
    ),
    { renderType: DataRenderType.ArrayElement },
  );
}

function ArrayElementRenderer({
  dataProps,
  options,
  formRenderer,
  renderOptions,
}: {
  dataProps: DataRendererProps;
  options: ArrayElementRendererOptions;
  formRenderer: FormRenderer;
  renderOptions: ArrayElementRenderOptions;
}) {
  const { control, formNode, renderChild, designMode } = dataProps;
  const extData = getExternalEditData(control);
  const overlayState = useOverlayTriggerState({
    isOpen: true,
    onOpenChange: () => {
      extData.value = undefined;
    },
  });

  if (designMode || extData.value !== undefined) {
    const parentDataNode = makeSchemaDataNode(
      dataProps.dataNode.schema,
      extData.fields.data,
    );
    const elementGroup: FormNode = nodeForControl(
      {
        type: ControlDefinitionType.Group,
        children: formNode.definition.children,
        groupOptions: { type: GroupRenderType.Standard, hideTitle: true },
      } as GroupedControlsDefinition,
      formNode.tree,
    );
    const editContent = (
      <div className={rendererClass(dataProps.className, options.className)}>
        {renderChild("", elementGroup, {
          parentDataNode,
          elementIndex: 0,
        })}
        <div className={options.actionsClass}>
          <RenderElements control={extData.fields.actions}>
            {(c) => formRenderer.renderAction(applyValidation(c.value))}
          </RenderElements>
        </div>
      </div>
    );
    if (renderOptions.showInline || designMode) return editContent;

    return (
      <Modal state={overlayState}>
        <Dialog children={editContent} />
      </Modal>
    );

    function runValidation(onClick: () => void) {
      let hasErrors = false;
      visitFormDataInContext(
        parentDataNode,
        elementGroup,
        validationVisitor(() => {
          hasErrors = true;
        }),
      );
      if (!hasErrors) onClick();
    }
    function applyValidation({
      action,
      dontValidate,
    }: ExternalEditAction): ActionRendererProps {
      return dontValidate
        ? action
        : {
            ...action,
            onClick: () => runValidation(action.onClick),
          };
    }
  } else return <></>;
}
