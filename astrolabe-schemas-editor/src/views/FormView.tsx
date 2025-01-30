import { EditableForm, getEditorFormTree, ViewContext } from "./index";
import {
  Control,
  RenderOptional,
  unsafeRestoreControl,
  useControl,
} from "@react-typed-forms/core";
import { FormControlPreview } from "../FormControlPreview";
import {
  addMissingControlsForSchema,
  FormTree,
} from "@react-typed-forms/schemas";
import React from "react";
import { FormPreview, PreviewData } from "../FormPreview";
import { toControlDefinitionForm } from "../schemaSchemas";

export function FormView(props: { formId: string; context: ViewContext }) {
  const { formId, context } = props;
  const control = context.getForm(formId);
  const previewData = useControl<PreviewData>({
    showing: false,
    showJson: false,
    showRawEditor: false,
    data: {},
  });
  return (
    <RenderOptional
      control={control}
      children={(x) => (
        <div className="h-full w-full overflow-auto">
          <RenderFormDesign c={x} context={context} preview={previewData} />
        </div>
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
    formRenderer,
    previewOptions,
    validation,
    extraPreviewControls,
    button,
  } = context;
  const rootNode = getEditorFormTree(c).rootNode;
  const rootSchema = context.schemaLookup.getSchema(c.fields.schemaId.value)!;
  const previewMode = preview.fields.showing.value;

  return (
    <div>
      <div>
        {button(
          () => preview.fields.showing.setValue((x) => !x),
          previewMode ? "Edit Mode" : "Editable Preview",
        )}
        {button(addMissing, "Add Missing Controls")}
      </div>
      {renderContent()}
    </div>
  );

  function addMissing() {
    if (rootSchema) {
      const existingChildren = unsafeRestoreControl(
        rootNode.definition.children,
      )!;
      const afterNew = addMissingControlsForSchema(
        rootSchema,
        existingChildren.value ?? [],
      ).map(toControlDefinitionForm);
      existingChildren.value = afterNew;
      console.log({ existingChildren, rootNode, afterNew });
    }
  }

  function renderContent() {
    if (preview.fields.showing.value)
      return (
        <FormPreview
          rootSchema={rootSchema}
          controls={rootNode}
          previewData={preview}
          formRenderer={formRenderer}
          validation={validation}
          previewOptions={previewOptions}
          createEditorRenderer={createEditorRenderer}
          // rootControlClass={rootControlClass}
          // controlsClass={controlsClass}
          extraPreviewControls={extraPreviewControls}
        />
      );

    return (
      <FormControlPreview
        keyPrefix="HAI"
        node={rootNode}
        parentNode={rootSchema}
        dropIndex={0}
      />
    );
  }
}
