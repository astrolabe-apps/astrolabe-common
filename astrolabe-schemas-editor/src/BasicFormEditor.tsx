import {
  ControlTree,
  removeNodeFromParent,
} from "@astroapps/ui-tree/ControlTree";
import {
  FormControlPreview,
  PreviewContextProvider,
} from "./FormControlPreview";
import {
  addElement,
  Control,
  Fselect,
  groupedChanges,
  RenderArrayElements,
  RenderControl,
  RenderElements,
  RenderOptional,
  trackedValue,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { FormControlEditor } from "./FormControlEditor";
import {
  ControlDefinitionForm,
  ControlDefinitionSchemaMap,
  defaultControlDefinitionForm,
  SchemaFieldForm,
  toControlDefinitionForm,
  toSchemaFieldForm,
} from "./schemaSchemas";
import {
  addMissingControls,
  applyExtensionsToSchema,
  cleanDataForSchema,
  ControlDefinition,
  ControlDefinitionExtension,
  ControlDefinitionType,
  ControlRenderer,
  ControlRenderOptions,
  FormRenderer,
  getAllReferencedClasses,
  GroupedControlsDefinition,
  GroupRenderType,
  SchemaField,
} from "@react-typed-forms/schemas";
import {
  isControlDefinitionNode,
  makeControlTree,
  SchemaFieldsProvider,
} from "./controlTree";
import { ControlTreeNode, useTreeStateControl } from "@astroapps/ui-tree";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import React, { ReactElement, ReactNode, useMemo } from "react";
import { controlIsCompoundField, controlIsGroupControl } from "./util";
import {
  createTailwindcss,
  TailwindConfig,
} from "@mhsdesign/jit-browser-tailwindcss";
import clsx from "clsx";
import defaultEditorControls from "./ControlDefinition.json";

interface PreviewData {
  showing: boolean;
  showJson: boolean;
  showRawEditor: boolean;
  data: any;
}

export function applyEditorExtensions(
  ...extensions: ControlDefinitionExtension[]
): typeof ControlDefinitionSchemaMap {
  return applyExtensionsToSchema(ControlDefinitionSchemaMap, extensions);
}

export interface BasicFormEditorProps<A extends string> {
  formRenderer: FormRenderer;
  editorRenderer: FormRenderer;
  loadForm: (
    formType: A,
  ) => Promise<{ controls: ControlDefinition[]; fields: SchemaField[] }>;
  selectedForm: Control<A>;
  formTypes: [A, string][];
  saveForm: (controls: ControlDefinition[]) => Promise<any>;
  validation?: (
    data: Control<any>,
    controls: ControlDefinition[],
  ) => Promise<any>;
  controlDefinitionSchemaMap?: typeof ControlDefinitionSchemaMap;
  editorControls?: ControlDefinition[];
  previewOptions?: ControlRenderOptions;
  tailwindConfig?: TailwindConfig;
  collectClasses?: (c: ControlDefinition) => (string | undefined | null)[];
  rootControlClass?: string;
  editorClass?: string;
  editorPanelClass?: string;
  controlsClass?: string;
  handleIcon?: ReactNode;
  extraPreviewControls?: ReactNode;
}

export function BasicFormEditor<A extends string>({
  formRenderer,
  selectedForm,
  loadForm,
  editorRenderer,
  formTypes,
  validation,
  saveForm,
  controlDefinitionSchemaMap = ControlDefinitionSchemaMap,
  editorControls,
  previewOptions,
  tailwindConfig,
  editorPanelClass,
  editorClass,
  rootControlClass,
  collectClasses,
  controlsClass,
  handleIcon,
  extraPreviewControls,
}: BasicFormEditorProps<A>): ReactElement {
  const controls = useControl<ControlDefinitionForm[]>([], {
    elems: makeControlTree(treeActions),
  });
  const fields = useControl<SchemaFieldForm[]>([]);
  const treeDrag = useControl();
  const treeState = useTreeStateControl();
  const selected = treeState.fields.selected;
  const ControlDefinitionSchema = controlDefinitionSchemaMap.ControlDefinition;
  const previewData = useControl<PreviewData>({
    showing: false,
    showJson: false,
    showRawEditor: false,
    data: {},
  });
  const controlGroup: GroupedControlsDefinition = useMemo(() => {
    return {
      children: addMissingControls(
        ControlDefinitionSchema,
        editorControls ?? defaultEditorControls,
      ),
      type: ControlDefinitionType.Group,
      groupOptions: { type: GroupRenderType.Standard },
    };
  }, [editorControls, defaultEditorControls]);

  const loadedForm = useControl<A>();
  useControlEffect(
    () => selectedForm.value,
    (ft) => {
      doLoadForm(ft);
    },
    true,
  );

  const genStyles = useMemo(
    () =>
      typeof window === "undefined"
        ? { generateStylesFromContent: async () => "" }
        : createTailwindcss({
            tailwindConfig: tailwindConfig ?? {
              corePlugins: { preflight: false },
            },
          }),
    [tailwindConfig],
  );

  const allClasses = useComputed(() => {
    const cv = trackedValue(controls);
    return cv
      .flatMap((x) => getAllReferencedClasses(x, collectClasses))
      .join(" ");
  });
  const styles = useControl("");

  useControlEffect(
    () => allClasses.value,
    (cv) => runTailwind(cv),
    true,
  );

  async function runTailwind(classes: string) {
    {
      const html = `<div class="${classes}"></div>`;

      styles.value = await genStyles.generateStylesFromContent(
        `@tailwind utilities;`,
        [html],
      );
    }
  }

  function button(onClick: () => void, action: string) {
    return formRenderer.renderAction({
      onClick,
      actionText: action,
      actionId: action,
    });
  }

  async function doLoadForm(dt: A) {
    const res = await loadForm(dt);
    groupedChanges(() => {
      controls.setInitialValue(res.controls.map(toControlDefinitionForm));
      fields.setInitialValue(res.fields.map(toSchemaFieldForm));
      loadedForm.value = dt;
    });
  }

  async function doSave() {
    saveForm(
      controls.value.map((c) =>
        cleanDataForSchema(c, ControlDefinitionSchema, true),
      ),
    );
  }

  const previewMode = previewData.fields.showing.value;
  const formType = selectedForm.value;
  return (
    <PreviewContextProvider
      value={{
        selected,
        treeDrag,
        VisibilityIcon: <i className="fa fa-eye" />,
        dropSuccess: () => {},
        renderer: formRenderer,
      }}
    >
      <SchemaFieldsProvider value={fields}>
        <PanelGroup direction="horizontal">
          <Panel>
            <RenderControl render={() => <style>{styles.value}</style>} />
            <div
              className={clsx(
                editorPanelClass,
                "overflow-auto w-full h-full p-8",
              )}
            >
              <div className={editorClass}>
                {previewMode ? (
                  <FormPreview
                    key={loadedForm.value ?? ""}
                    fields={trackedValue(fields)}
                    controls={trackedValue(controls)}
                    previewData={previewData}
                    formRenderer={formRenderer}
                    validation={validation}
                    previewOptions={previewOptions}
                    rawRenderer={editorRenderer}
                    rootControlClass={rootControlClass}
                    controlsClass={controlsClass}
                    extraPreviewControls={extraPreviewControls}
                  />
                ) : (
                  <div className={controlsClass}>
                    <RenderElements
                      key={formType}
                      control={controls}
                      children={(c, i) => (
                        <div className={rootControlClass}>
                          <FormControlPreview
                            keyPrefix={formType}
                            definition={trackedValue(c)}
                            fields={trackedValue(fields)}
                            dropIndex={i}
                          />
                        </div>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </Panel>
          <PanelResizeHandle className="w-2 bg-surface-200" />
          <Panel defaultSize={33}>
            <PanelGroup direction="vertical">
              <Panel>
                <div className="p-4 overflow-auto w-full h-full">
                  <div className="my-2 flex gap-2">
                    <Fselect control={selectedForm}>
                      <RenderArrayElements
                        array={formTypes}
                        children={(x) => <option value={x[0]}>{x[1]}</option>}
                      />
                    </Fselect>
                    {button(doSave, "Save " + selectedForm.value)}
                    {button(
                      togglePreviewMode,
                      previewMode ? "Edit Mode" : "Editable Preview",
                    )}
                    {button(addMissing, "Add missing controls")}
                  </div>
                  <ControlTree
                    treeState={treeState}
                    controls={controls}
                    indicator={false}
                    canDropAtRoot={() => true}
                    itemConfig={{ handleIcon }}
                  />
                  {button(
                    () =>
                      addElement(controls, {
                        ...defaultControlDefinitionForm,
                        type: ControlDefinitionType.Group,
                      }),
                    "Add Page",
                  )}
                </div>
              </Panel>
              <PanelResizeHandle className="h-2 bg-surface-200" />
              <Panel>
                <div className="p-4 overflow-auto w-full h-full">
                  <RenderOptional control={selected}>
                    {(c) => (
                      <FormControlEditor
                        key={c.value.uniqueId}
                        control={c.value}
                        fields={fields}
                        renderer={editorRenderer}
                        editorFields={ControlDefinitionSchema}
                        rootControls={controls}
                        editorControls={controlGroup}
                      />
                    )}
                  </RenderOptional>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </SchemaFieldsProvider>
    </PreviewContextProvider>
  );

  function addMissing() {
    controls.value = addMissingControls(fields.value, controls.value).map(
      toControlDefinitionForm,
    );
  }
  function togglePreviewMode() {
    previewData.fields.showing.setValue((x) => !x);
  }

  function treeActions(
    node: ControlTreeNode,
    schema: Control<SchemaFieldForm>,
  ) {
    const c = node.control;
    return (
      <>
        {isControlDefinitionNode(c) &&
          (controlIsGroupControl(c) || controlIsCompoundField(schema)) && (
            <i
              className="fa fa-plus"
              onClick={(e) => {
                e.stopPropagation();
                selected.value = addElement(c.fields.children, {
                  ...defaultControlDefinitionForm,
                  title: "New",
                });
              }}
            />
          )}
        <i
          className="fa fa-remove"
          onClick={(e) => {
            e.stopPropagation();
            removeNodeFromParent(node, selected);
          }}
        />
      </>
    );
  }
}

function FormPreview({
  previewData,
  formRenderer,
  controls,
  fields,
  validation,
  rootControlClass,
  previewOptions,
  rawRenderer,
  controlsClass,
  extraPreviewControls,
}: {
  previewData: Control<PreviewData>;
  fields: SchemaField[];
  controls: ControlDefinition[];
  formRenderer: FormRenderer;
  rawRenderer: FormRenderer;
  validation?: (data: any, controls: ControlDefinition[]) => Promise<any>;
  previewOptions?: ControlRenderOptions;
  rootControlClass?: string;
  controlsClass?: string;
  extraPreviewControls?: ReactNode;
}) {
  const { data, showJson, showRawEditor } = previewData.fields;
  const jsonControl = useControl(() =>
    JSON.stringify(data.current.value, null, 2),
  );
  const rawControls: GroupedControlsDefinition = useMemo(
    () => ({
      type: ControlDefinitionType.Group,
      children: addMissingControls(fields, []),
    }),
    [],
  );
  useControlEffect(
    () => data.value,
    (v) => (jsonControl.value = JSON.stringify(v, null, 2)),
  );
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
        {extraPreviewControls}
      </div>
      <RenderControl render={renderRaw} />

      <div className={controlsClass}>
        <RenderArrayElements
          array={controls}
          children={(c) => (
            <div className={rootControlClass}>
              <ControlRenderer
                definition={c}
                fields={fields}
                renderer={formRenderer}
                control={data}
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
              <ControlRenderer
                definition={rawControls}
                renderer={rawRenderer}
                fields={fields}
                control={data}
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
