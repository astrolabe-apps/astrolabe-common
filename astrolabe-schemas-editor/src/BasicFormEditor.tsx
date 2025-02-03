import {
  Control,
  ensureMetaValue,
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
import {
  ControlDefinitionForm,
  ControlDefinitionSchemaMap,
} from "./schemaSchemas";
import {
  addMissingControls,
  applyExtensionsToSchema,
  cleanDataForSchema,
  ControlDefinition,
  ControlDefinitionExtension,
  ControlDefinitionType,
  ControlRenderOptions,
  createFormRenderer,
  FormNode,
  FormRenderer,
  getAllReferencedClasses,
  GroupedControlsDefinition,
  GroupRenderType,
  RendererRegistration,
  rootSchemaNode,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import React, { ReactElement, ReactNode, useMemo, useRef } from "react";
import {
  createTailwindcss,
  TailwindConfig,
} from "@mhsdesign/jit-browser-tailwindcss";
import defaultEditorControls from "./ControlDefinition.json";
import {
  DockLayout,
  LayoutBase,
  PanelData,
  TabBase,
  TabData,
} from "rc-dock/es";
import { EditableForm, getViewAndParams, ViewContext } from "./views";
import { createView } from "./views/createView";
import { find } from "./dockHelper";

export interface BasicFormEditorProps<A extends string> {
  formRenderer: FormRenderer;
  createEditorRenderer?: (renderers: RendererRegistration[]) => FormRenderer;
  schemas: SchemaTreeLookup;
  loadForm: (
    formType: A,
  ) => Promise<{ controls: ControlDefinition[]; schemaName: string }>;
  selectedForm: Control<A>;
  formTypes: [A, string][];
  saveForm: (controls: ControlDefinition[]) => Promise<any>;
  validation?: (data: Control<any>, controls: FormNode) => Promise<any>;
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
    | ((c: FormNode, data: Control<any>) => ReactNode);
}

export function BasicFormEditor<A extends string>({
  formRenderer,
  selectedForm,
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
  const extensions = useMemo(
    () => [...(_extensions ?? []), ValueForFieldExtension],
    [_extensions],
  );
  const controlDefinitionSchemaMap = useMemo(
    () => applyExtensionsToSchema(ControlDefinitionSchemaMap, extensions ?? []),
    [extensions],
  );
  const dockRef = useRef<DockLayout | null>(null);
  const loadedForms = useControl<Record<string, EditableForm | undefined>>({});
  const ControlDefinitionSchema = controlDefinitionSchemaMap.ControlDefinition;
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
    const cv = trackedValue(loadedForms);
    return Object.values(cv)
      .flatMap((x) => x?.root.children ?? [])
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

  useControlEffect(
    () => loadedForm.value,
    (formId) => {
      if (formId) openForm(formId);
    },
  );
  async function doSaveForm(c: Control<EditableForm>) {
    await saveForm(
      c.fields.root.value.children?.map((c) =>
        cleanDataForSchema(c, ControlDefinitionSchema, true),
      ) ?? [],
    );
  }

  const viewContext: ViewContext = {
    formRenderer,
    validation,
    previewOptions,
    button,
    currentForm: loadedForm.as(),
    schemaLookup: schemas,
    getForm,
    getCurrentForm: () =>
      loadedForm.value ? getForm(loadedForm.value) : undefined,
    extensions,
    editorControls: controlGroup,
    createEditorRenderer,
    editorFields: rootSchemaNode(ControlDefinitionSchema),
    formList: formTypes.map(([id, name]) => ({ id, name })),
    openForm,
    updateTabTitle,
    saveForm: doSaveForm,
  };
  const layout = useControl<LayoutBase>(
    () =>
      ({
        dockbox: {
          mode: "horizontal",
          children: [
            {
              id: "project",
              tabs: [{ id: "formList" }],
              size: 1,
            },
            {
              id: "documents",
              group: "documents",
              size: 5,
              tabs: [],
            },
            {
              mode: "vertical",
              size: 4,
              children: [
                {
                  mode: "horizontal",
                  children: [
                    {
                      tabs: [{ id: "formStructure" }],
                    },
                    { tabs: [{ id: "currentSchema" }] },
                  ],
                },
                {
                  tabs: [{ id: "controlProperties" }],
                },
              ],
            },
          ],
        },
      }) satisfies LayoutBase,
  );

  return (
    <DockLayout
      ref={dockRef}
      layout={layout.value}
      loadTab={loadTab}
      groups={{ documents: {} }}
      afterPanelLoaded={(savedPanel, loadedPanel) => {
        if (loadedPanel.id === "documents") {
          loadedPanel.panelLock = {};
        }
      }}
      saveTab={({ id, title }) => ({ id, title })}
      onLayoutChange={(newLayout, currentTabId, direction) => {
        layout.value = newLayout;
        const docPanel = find(newLayout, "documents") as PanelData;
        if (docPanel.activeId) {
          const [viewType, viewParams] = getViewAndParams(docPanel.activeId);
          if (viewType === "form" && viewParams) {
            loadedForm.value = viewParams as A;
          }
        } else loadedForm.value = undefined;
      }}
      style={{
        position: "absolute",
        left: 10,
        top: 10,
        right: 10,
        bottom: 10,
      }}
    />
  );

  function updateTabTitle(tabId: string, title: string) {
    const dockApi = dockRef.current!;
    const tab = dockApi.find(tabId) as TabData;
    if (tab) {
      dockApi.updateTab(tabId, { ...tab, title });
    }
  }

  function getForm(formId: string) {
    const form = loadedForms.fields[formId];
    ensureMetaValue(form, "loader", () => loadFormNode(formId, form));
    return form;
  }

  function openForm(formId: string) {
    const tabId = "form:" + formId;
    const dockApi = dockRef.current!;
    if (!dockApi.find(tabId)) {
      dockApi.dockMove(
        { id: tabId } as TabData,
        dockApi.find("documents")!,
        "middle",
      );
    }
  }

  function loadTab(savedTab: TabBase): TabData {
    return { ...createView(savedTab.id!, viewContext), ...savedTab };
  }

  async function loadFormNode(
    formId: string,
    control: Control<EditableForm | undefined>,
  ) {
    const res = await loadForm(formId as A);
    control.setInitialValue({
      root: { children: res.controls, type: ControlDefinitionType.Group },
      schemaId: res.schemaName,
      hideFields: false,
    });
  }
}
