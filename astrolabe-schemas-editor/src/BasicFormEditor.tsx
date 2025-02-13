import {
  addElement,
  Control,
  ensureMetaValue,
  Fcheckbox,
  groupedChanges,
  trackedValue,
  unsafeRestoreControl,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
  ValueForFieldExtension,
} from "@react-typed-forms/schemas-html";
import { ControlDefinitionSchemaMap } from "./schemaSchemas";
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
  LabelType,
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
  PanelBase,
  PanelData,
  TabBase,
  TabData,
} from "rc-dock/es";
import { EditableForm, FormInfo, getViewAndParams, ViewContext } from "./views";
import { createView } from "./views/createView";
import { AnyBase, find } from "./dockHelper";

export interface BasicFormEditorProps {
  formRenderer: FormRenderer;
  createEditorRenderer?: (renderers: RendererRegistration[]) => FormRenderer;
  schemas: SchemaTreeLookup;
  loadForm: (
    formId: string,
  ) => Promise<{ controls: ControlDefinition[]; schemaName: string }>;
  selectedForm?: Control<string | undefined>;
  formTypes: [string, string][] | FormInfo[];
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
}: BasicFormEditorProps): ReactElement {
  const selectedForm = useControl<string|undefined>(undefined, { use: sf });
  const extensions = useMemo(
    () => [...(_extensions ?? []), ValueForFieldExtension],
    [_extensions],
  );
  const controlDefinitionSchemaMap = useMemo(
    () => applyExtensionsToSchema(ControlDefinitionSchemaMap, extensions ?? []),
    [extensions],
  );
  const editorFormRenderer = useMemo(() => createEditorRenderer([]), []);
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
    return editorFormRenderer.renderAction({
      onClick,
      actionText: action,
      actionId: actionId ?? action,
    });
  }

  function checkbox(control: Control<boolean>, text: string) {
    const cId = "c" + control.uniqueId;
    return (
      <div className="flex gap-2 items-center">
        <Fcheckbox control={control} id={cId} />
        {editorFormRenderer.renderLabel({
          type: LabelType.Control,
          label: text,
          forId: cId,
        })}
      </div>
    );
  }

  useControlEffect(
    () => selectedForm.value,
    (formId) => {
      if (formId) {
        openForm(formId);
      }
    },
    true,
  );
  async function doSaveForm(c: Control<EditableForm>) {
    await saveForm(
      c.fields.root.value.children?.map((c) =>
        cleanDataForSchema(c, ControlDefinitionSchema, true),
      ) ?? [],
    );
    c.fields.root.markAsClean();
  }

  const viewContext: ViewContext = {
    formRenderer,
    validation,
    previewOptions,
    button,
    currentForm: selectedForm,
    schemaLookup: schemas,
    getForm,
    extraPreviewControls,
    editorPanelClass,
    getCurrentForm: () =>
      selectedForm.value ? getForm(selectedForm.value) : undefined,
    extensions,
    editorControls: controlGroup,
    createEditorRenderer,
    editorFields: rootSchemaNode(ControlDefinitionSchema),
    formList: formTypes.map((e) =>
      Array.isArray(e) ? { id: e[0], name: e[1] } : e,
    ),
    openForm,
    updateTabTitle,
    saveForm: doSaveForm,
    checkbox,
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
            selectedForm.value = viewParams;
          }
        } else selectedForm.value = undefined;
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

  function findLayoutControl<V extends AnyBase>(
    id: string,
  ): Control<V> | undefined {
    const layoutTracked = trackedValue(layout);
    return unsafeRestoreControl(find(layoutTracked, id) as V)!;
  }

  function updateTabTitle(tabId: string, title: string) {
    const tab = findLayoutControl<TabData>(tabId);
    if (tab) {
      tab.fields.title.value = title;
    }
  }

  function getForm(formId: string) {
    const form = loadedForms.fields[formId];
    ensureMetaValue(form, "loader", () => loadFormNode(formId, form));
    return form;
  }

  function getTabInPanel(
    panelId: string,
    tabId: string,
  ): [Control<PanelBase>, tab: Control<TabBase> | undefined] {
    const panelBaseControl = findLayoutControl<PanelBase>(panelId)!;
    const tabsControl = panelBaseControl.fields.tabs;
    return [
      panelBaseControl,
      tabsControl.elements.find((x) => x.fields.id.value === tabId),
    ];
  }

  function openForm(formId: string) {
    const tabId = "form:" + formId;
    const [docs, tab] = getTabInPanel("documents", tabId);
    groupedChanges(() => {
      if (!tab) {
        addElement(docs.fields.tabs, { id: tabId });
      }
      docs.fields.activeId.value = tabId;
    });
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
      root: { 
        children: res.controls, type: ControlDefinitionType.Group, 
        groupOptions: { 
          type: GroupRenderType.Standard, childLayoutClass: rootControlClass, hideTitle: true
        } 
      } as ControlDefinition,
      schemaId: res.schemaName,
      hideFields: false,
    });
  }
}
