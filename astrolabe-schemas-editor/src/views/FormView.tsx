import { EditableForm, ViewContext } from "./index";
import {
  Control,
  RenderOptional,
  unsafeRestoreControl,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { FormControlPreview } from "../FormControlPreview";
import {
  addMissingControlsForSchema,
  addMissingControlsToForm,
} from "@react-typed-forms/schemas";
import React from "react";
import { FormPreview, PreviewData } from "../FormPreview";
import { toControlDefinitionForm } from "../schemaSchemas";
import clsx from "clsx";

export function FormView(props: { formId: string; context: ViewContext }) {
  const { formId, context } = props;
  const control = context.getForm(formId);
  const previewData = useControl<PreviewData>({
    showing: false,
    showJson: false,
    showRawEditor: false,
    data: {},
  });
  useControlEffect(
    () =>
      [
        control.fields.formTree.value?.root.dirty,
        control.fields.name.value,
      ] as const,
    ([unsaved, name]) => {
      if (name) {
        context.updateTabTitle("form:" + formId, unsaved ? name + " *" : name);
      }
    },
    true,
  );
  return (
    <RenderOptional
      control={control}
      children={(x) => (
        <RenderFormDesign c={x} context={context} preview={previewData} />
      )}
    />
  );
}

function RenderFormDesign({
  c,
  context,
  preview,
}: {
  c: Control<EditableForm>;
  preview: Control<PreviewData>;
  context: ViewContext;
}) {
  const {
    createEditorRenderer,
    previewOptions,
    validation,
    extraPreviewControls,
    button,
    checkbox,
  } = context;
  const rootNode = c.fields.formTree.value.rootNode;
  const rootSchema = context.schemaLookup.getSchema(c.fields.schemaId.value)!;
  const formRenderer = c.fields.renderer.value;
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2">
        <div className="flex gap-2 items-center">
          {checkbox(preview.fields.showing, "Preview Mode")}
          {button(save, "Save")}
        </div>
      </div>
      {renderContent()}
    </div>
  );

  function save() {
    context.saveForm(c);
  }

  function addMissing() {
    if (rootSchema) {
      addMissingControlsToForm(rootSchema, c.fields.formTree.value);
    }
  }

  function renderContent() {
    if (preview.fields.showing.value)
      return (
        <FormPreview
          viewContext={context}
          rootSchema={rootSchema}
          controls={rootNode}
          previewData={preview}
          formRenderer={formRenderer}
          validation={validation}
          previewOptions={previewOptions}
          createEditorRenderer={createEditorRenderer}
          editorPanelClass={context.editorPanelClass}
          // rootControlClass={rootControlClass}
          // controlsClass={controlsClass}
          extraPreviewControls={extraPreviewControls}
        />
      );

    return (
      <>
        <div className="flex gap-4 px-4 mb-2">
          {checkbox(c.fields.hideFields, "Hide Field Names")}
          {button(addMissing, "Add Missing Controls")}
        </div>
        <div className={clsx("grow overflow-auto", context.editorPanelClass)}>
          <FormControlPreview
            keyPrefix="HAI"
            node={rootNode}
            parentNode={rootSchema}
            dropIndex={0}
            context={{
              selected: c.fields.selectedControlId,
              VisibilityIcon: <i className="fa fa-eye" />,
              renderer: formRenderer,
              hideFields: c.fields.hideFields,
            }}
          />
        </div>
      </>
    );
  }
}
