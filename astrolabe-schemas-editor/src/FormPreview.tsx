import {
  Control,
  RenderControl,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  addMissingControls,
  ControlDefinitionType,
  ControlRenderOptions,
  createSchemaDataNode,
  FormNode,
  FormRenderer,
  GroupedControlsDefinition,
  NewControlRenderer,
  RendererRegistration,
  SchemaNode,
} from "@react-typed-forms/schemas";
import React, { ReactNode, useMemo } from "react";
import { JsonEditor } from "./JsonEditor";
import { ViewContext } from "./types";

export interface PreviewData {
  showing: boolean;
  showJson: boolean;
  showRawEditor: boolean;
  data: any;
}

export function FormPreview({
  previewData,
  formRenderer,
  controls,
  rootSchema,
  validation,
  rootControlClass,
  previewOptions,
  createEditorRenderer,
  editorPanelClass,
  extraPreviewControls,
  viewContext,
}: {
  viewContext: ViewContext;
  previewData: Control<PreviewData>;
  rootSchema: SchemaNode;
  controls: FormNode;
  formRenderer: FormRenderer;
  createEditorRenderer: (registrations: RendererRegistration[]) => FormRenderer;
  validation?: (data: any, controls: FormNode) => Promise<any>;
  previewOptions?: ControlRenderOptions;
  rootControlClass?: string;
  editorPanelClass?: string;
  extraPreviewControls?:
    | ReactNode
    | ((c: FormNode, data: Control<any>) => ReactNode);
}) {
  const rawRenderer = useMemo(() => createEditorRenderer([]), []);
  const { data, showJson, showRawEditor } = previewData.fields;
  const jsonControl = useControl(() =>
    JSON.stringify(data.current.value, null, 2),
  );
  const rawControls: GroupedControlsDefinition = useMemo(
    () => ({
      type: ControlDefinitionType.Group,
      children: addMissingControls(
        rootSchema.getChildNodes().map((x) => x.field),
        [],
      ),
    }),
    [],
  );
  useControlEffect(
    () => data.value,
    (v) => (jsonControl.value = JSON.stringify(v, null, 2)),
  );
  const rootDataNode = createSchemaDataNode(rootSchema, data);
  return (
    <>
      <div className="px-4 flex gap-4">
        {viewContext.checkbox(showRawEditor, "Show Raw Editor")}
        {viewContext.checkbox(showJson, "Show Json")}
        {formRenderer.renderAction({
          onClick: runValidation,
          actionId: "validate",
          actionText: "Run Validation",
        })}
        {typeof extraPreviewControls === "function"
          ? extraPreviewControls(controls, data)
          : extraPreviewControls}
      </div>

      <div className="grow overflow-auto">
        <RenderControl render={renderRaw} />
        <div className={editorPanelClass}>
          <NewControlRenderer
            definition={controls}
            parentDataNode={rootDataNode}
            renderer={formRenderer}
            options={previewOptions}
          />
        </div>
      </div>
    </>
  );

  function renderRaw() {
    const sre = showRawEditor.value;
    const sj = showJson.value;
    return (
      (sre || sj) && (
        <div className="grid grid-cols-2 gap-3 my-4 border p-4">
          {sre && (
            <div>
              <div className="text-xl">Edit Data</div>
              <NewControlRenderer
                definition={rawControls}
                renderer={rawRenderer}
                parentDataNode={rootDataNode}
              />
            </div>
          )}
          {sj && (
            <div>
              <div className="text-xl">JSON</div>
              <JsonEditor className="h-96" control={jsonControl} />
              {formRenderer.renderAction({
                actionText: "Apply JSON",
                onClick: () => {
                  data.value = JSON.parse(jsonControl.value);
                },
                actionId: "applyJson",
              })}
            </div>
          )}
        </div>
      )
    );
  }

  async function runValidation() {
    data.touched = true;
    await validation?.(data, controls);
  }
}
