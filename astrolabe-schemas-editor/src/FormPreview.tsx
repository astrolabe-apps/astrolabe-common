import {
  Control,
  RenderArrayElements,
  RenderControl,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  addMissingControls,
  ControlDefinition,
  ControlDefinitionType,
  ControlRenderOptions,
  FormRenderer,
  GroupedControlsDefinition,
  makeSchemaDataNode,
  NewControlRenderer,
  RendererRegistration,
  SchemaNode,
} from "@react-typed-forms/schemas";
import React, { ReactNode, useMemo } from "react";

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
  controlsClass,
  extraPreviewControls,
}: {
  previewData: Control<PreviewData>;
  rootSchema: SchemaNode;
  controls: ControlDefinition[];
  formRenderer: FormRenderer;
  createEditorRenderer: (registrations: RendererRegistration[]) => FormRenderer;
  validation?: (data: any, controls: ControlDefinition[]) => Promise<any>;
  previewOptions?: ControlRenderOptions;
  rootControlClass?: string;
  controlsClass?: string;
  extraPreviewControls?:
    | ReactNode
    | ((c: ControlDefinition[], data: Control<any>) => ReactNode);
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
  const rootDataNode = makeSchemaDataNode(rootSchema, data);
  return (
    <>
      <div className="my-2 flex gap-2">
        {formRenderer.renderAction({
          onClick: runValidation,
          actionId: "validate",
          actionText: "Run Validation",
        })}
        {formRenderer.renderAction({
          onClick: () => showRawEditor.setValue((x) => !x),
          actionId: "",
          actionText: "Toggle Raw Edit",
        })}
        {formRenderer.renderAction({
          onClick: () => showJson.setValue((x) => !x),
          actionId: "",
          actionText: "Toggle JSON",
        })}
        {typeof extraPreviewControls === "function"
          ? extraPreviewControls(controls, data)
          : extraPreviewControls}
      </div>
      <RenderControl render={renderRaw} />

      <div className={controlsClass}>
        <RenderArrayElements
          array={controls}
          children={(c) => (
            <div className={rootControlClass}>
              <NewControlRenderer
                definition={c}
                parentDataNode={rootDataNode}
                renderer={formRenderer}
                options={previewOptions}
              />
            </div>
          )}
        />
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
              <RenderControl>
                {() => (
                  <textarea
                    className="w-full"
                    rows={10}
                    onChange={(e) => (jsonControl.value = e.target.value)}
                    value={jsonControl.value}
                  />
                )}
              </RenderControl>
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
