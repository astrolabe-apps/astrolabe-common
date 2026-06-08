import {
  ActionRendererProps,
  ArrayElementRenderOptions,
  ControlDefinitionType,
  createDataRenderer,
  DataRendererProps,
  DataRenderType,
  ExternalEditAction,
  FormRenderer,
  FormStateNode,
  getExternalEditData,
  createSchemaDataNode,
  GroupedControlsDefinition,
  GroupRenderType,
  RenderForm,
  rendererClass,
} from "@react-typed-forms/schemas";
import { ArrayElementRendererOptions } from "../rendererOptions";
import React, { useRef } from "react";
import { Dialog, Modal } from "@astroapps/aria-base";
import { useOverlayTriggerState } from "@react-stately/overlays";
import { RenderElements } from "@react-typed-forms/core";
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
  const { control, formNode, designMode, dataNode } = dataProps;
  const extData = getExternalEditData(control);
  const draftStateRef = useRef<FormStateNode | null>(null);
  const overlayState = useOverlayTriggerState({
    isOpen: true,
    onOpenChange: () => {
      extData.value = undefined;
    },
  });

  if (designMode || extData.value !== undefined) {
    // The staged-edit session stores its draft as a single-element array (see
    // createArrayActions). Render element 0 of that draft against a standalone
    // form built from the array's element template, so the dialog edits the
    // draft — not the live array element — until Apply commits it.
    const draftData = extData.fields.data;
    const hasDraft =
      Array.isArray(draftData.value) && draftData.value.length > 0;

    const elementForm = formNode.form?.createChildNode("draft", {
      type: ControlDefinitionType.Group,
      children: formNode.form.getResolvedChildren(),
      groupOptions: { type: GroupRenderType.Standard, hideTitle: true },
    } as GroupedControlsDefinition);

    const draftForm =
      hasDraft && elementForm ? (
        <RenderForm
          form={elementForm}
          renderer={formRenderer}
          data={createSchemaDataNode(
            dataNode.schema,
            draftData,
          ).getChildElement(0)}
          stateRef={draftStateRef}
        />
      ) : null;

    const editContent = (
      <div className={rendererClass(dataProps.className, options.className)}>
        {draftForm}
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
      const draftState = draftStateRef.current;
      if (!draftState) {
        onClick();
        return;
      }
      draftState.setTouched(true);
      if (draftState.validate()) onClick();
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
