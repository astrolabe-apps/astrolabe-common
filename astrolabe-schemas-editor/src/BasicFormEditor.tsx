import {
  FormControlPreview,
  PreviewContextProvider,
} from "./FormControlPreview";
import {
  addElement,
  Control,
  Fcheckbox,
  Fselect,
  groupedChanges,
  RenderArrayElements,
  RenderControl,
  RenderOptional,
  trackedValue,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
  ValueForFieldExtension,
} from "@react-typed-forms/schemas-html";
import { FormControlEditor } from "./FormControlEditor";
import {
  ControlDefinitionForm,
  ControlDefinitionSchemaMap,
  defaultControlDefinitionForm,
  toControlDefinitionForm,
} from "./schemaSchemas";
import {
  addMissingControls,
  addMissingControlsForSchema,
  applyExtensionsToSchema,
  cleanDataForSchema,
  ControlDefinition,
  ControlDefinitionExtension,
  ControlDefinitionType,
  ControlRenderOptions,
  createFormLookup,
  createFormRenderer,
  FormRenderer,
  getAllReferencedClasses,
  GroupedControlsDefinition,
  GroupRenderType,
  RendererRegistration,
  rootSchemaNode,
  SchemaNode,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import React, { ReactElement, ReactNode, useMemo, useRef } from "react";
import {
  createTailwindcss,
  TailwindConfig,
} from "@mhsdesign/jit-browser-tailwindcss";
import clsx from "clsx";
import defaultEditorControls from "./ControlDefinition.json";
import { FormControlTree } from "./FormControlTree";
import { FormSchemaTree } from "./FormSchemaTree";
import { FormPreview, PreviewData } from "./FormPreview";
import { ControlNode, SelectedControlNode } from "./types";
import { TreeApi } from "react-arborist";

export interface BasicFormEditorProps<A extends string> {
  formRenderer: FormRenderer;
  createEditorRenderer?: (renderers: RendererRegistration[]) => FormRenderer;
  schemas: SchemaTreeLookup;
  loadForm: (
    formType: A,
  ) => Promise<{ controls: ControlDefinition[]; schemaName: string }>;
  selectedForm?: Control<A>;
  formTypes: [A, string][];
  saveForm: (controls: ControlDefinition[]) => Promise<any>;
  validation?: (
    data: Control<any>,
    controls: ControlDefinition[],
  ) => Promise<any>;
  extensions?: ControlDefinitionExtension[];
  editorControls?: ControlDefinition[];
  previewOptions?: ControlRenderOptions;
  tailwindConfig?: TailwindConfig;
  collectClasses?: (c: ControlDefinition) => (string | undefined | null)[];
  rootControlClass?: string;
  editorClass?: string;
  editorPanelClass?: string;
  controlsClass?: string;
  handleIcon?: ReactNode;
  extraPreviewControls?:
    | ReactNode
    | ((c: ControlDefinition[], data: Control<any>) => ReactNode);
}

export function BasicFormEditor<A extends string>({
  formRenderer,
  selectedForm: sf,
  loadForm,
  createEditorRenderer = (e) =>
    createFormRenderer(e, createDefaultRenderers(defaultTailwindTheme)),
  formTypes,
  validation,
  saveForm,
  extensions: _extensions,
  editorControls,
  previewOptions,
  tailwindConfig,
  editorPanelClass,
  editorClass,
  rootControlClass,
  collectClasses,
  schemas,
  controlsClass,
  handleIcon,
  extraPreviewControls,
}: BasicFormEditorProps<A>): ReactElement {
  const selectedForm = useControl<A>(() => formTypes[0][0], { use: sf });
  const extensions = useMemo(
    () => [...(_extensions ?? []), ValueForFieldExtension],
    [_extensions],
  );
  const controlDefinitionSchemaMap = useMemo(
    () => applyExtensionsToSchema(ControlDefinitionSchemaMap, extensions ?? []),
    [extensions],
  );
  const controls = useControl<ControlDefinitionForm[]>([]);
  const treeLookup = createFormLookup({ "": trackedValue(controls) });
  const baseSchema = useControl<string>();
  const treeDrag = useControl();
  const selected = useControl<SelectedControlNode>();
  const selectedField = useControl<SchemaNode>();
  const hideFields = useControl(false);
  const ControlDefinitionSchema = controlDefinitionSchemaMap.ControlDefinition;
  const controlTreeApi = useRef<TreeApi<ControlNode>>(null);
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
  const rootSchema = schemas.getSchema(baseSchema.value ?? "");

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

  function button(onClick: () => void, action: string, actionId?: string) {
    return formRenderer.renderAction({
      onClick,
      actionText: action,
      actionId: actionId ?? action,
    });
  }

  async function doLoadForm(dt: A) {
    const res = await loadForm(dt);
    groupedChanges(() => {
      controls.setInitialValue(res.controls.map(toControlDefinitionForm));
      baseSchema.setInitialValue(res.schemaName);
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
        hideFields,
      }}
    >
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
              {rootSchema &&
                (previewMode ? (
                  <FormPreview
                    key={loadedForm.value ?? ""}
                    rootSchema={rootSchema}
                    controls={trackedValue(controls)}
                    previewData={previewData}
                    formRenderer={formRenderer}
                    validation={validation}
                    previewOptions={previewOptions}
                    createEditorRenderer={createEditorRenderer}
                    rootControlClass={rootControlClass}
                    controlsClass={controlsClass}
                    extraPreviewControls={extraPreviewControls}
                  />
                ) : (
                  <div className={controlsClass}>
                    <RenderArrayElements
                      key={formType}
                      array={treeLookup.getForm("")!.rootNode.getChildNodes()}
                      children={(c, i) => (
                        <div className={rootControlClass}>
                          <FormControlPreview
                            keyPrefix={formType}
                            node={c}
                            parentNode={rootSchema}
                            dropIndex={i}
                          />
                        </div>
                      )}
                    />
                  </div>
                ))}
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-2 bg-surface-200" />
        <Panel defaultSize={33}>
          <PanelGroup direction="vertical">
            <Panel>
              <div className="h-full flex flex-col p-2">
                <div className="flex gap-2">
                  <Fselect control={selectedForm.as()}>
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
                <div className="my-2">
                  <div className="flex items-center gap-2">
                    <Fcheckbox control={hideFields} id="hideFields" />{" "}
                    <label htmlFor="hideFields">Hide field names</label>
                  </div>
                </div>
                <div className="grow flex overflow-y-hidden border">
                  {rootSchema && (
                    <PanelGroup direction="horizontal">
                      <Panel>
                        <div className="flex flex-col h-full">
                          <div className="flex gap-2">
                            <h2 className="text-xl my-2">Controls</h2>
                            {button(
                              () => controlTreeApi.current?.closeAll(),
                              "Collapse",
                            )}
                          </div>
                          <FormControlTree
                            treeApi={controlTreeApi}
                            className="overflow-hidden grow"
                            controls={controls}
                            rootSchema={rootSchema}
                            selectedField={selectedField}
                            selected={selected}
                            onDeleted={(c) => {
                              const sel = selected.value;
                              if (sel && sel.control === c.data.control) {
                                selected.value = undefined;
                              }
                            }}
                          />
                        </div>
                      </Panel>
                      <PanelResizeHandle className="w-2 bg-surface-200" />
                      <Panel>
                        <div className="flex flex-col h-full">
                          <h2 className="text-xl my-2">Schema</h2>
                          <FormSchemaTree
                            className="overflow-hidden grow"
                            selectedControl={selected}
                            rootControls={controls}
                            rootSchema={rootSchema}
                            selected={selectedField}
                          />
                        </div>
                      </Panel>
                    </PanelGroup>
                  )}
                </div>
                <div>
                  {button(
                    () =>
                      addElement(controls, {
                        ...defaultControlDefinitionForm,
                        type: ControlDefinitionType.Group,
                      }),
                    "Add Control",
                  )}
                </div>
              </div>
            </Panel>
            <PanelResizeHandle className="h-2 bg-surface-200" />
            <Panel>
              <div className="p-4 overflow-auto w-full h-full">
                <RenderOptional control={selected}>
                  {(c) => (
                    <FormControlEditor
                      key={c.value.control.uniqueId}
                      controlNode={c.value}
                      createEditorRenderer={createEditorRenderer}
                      extensions={extensions}
                      editorFields={rootSchemaNode(ControlDefinitionSchema)}
                      editorControls={controlGroup}
                    />
                  )}
                </RenderOptional>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </PreviewContextProvider>
  );

  function addMissing() {
    if (rootSchema) {
      controls.value = addMissingControlsForSchema(
        rootSchema,
        controls.value,
      ).map(toControlDefinitionForm);
    }
  }
  function togglePreviewMode() {
    previewData.fields.showing.setValue((x) => !x);
  }
}
