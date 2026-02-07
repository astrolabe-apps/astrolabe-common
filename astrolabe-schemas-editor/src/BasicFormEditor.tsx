import {
  Control,
  ensureMetaValue,
  Fcheckbox,
  RenderControl,
  trackedValue,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  createButtonActionRenderer,
  createDefaultRenderers,
  defaultTailwindTheme,
  ValueForFieldExtension,
} from "@react-typed-forms/schemas-html";
import { ControlDefinitionSchemaMap } from "./schemaSchemas";
import {
  addMissingControlsForSchema,
  applyExtensionsToSchema,
  cleanDataForSchema,
  ControlDefinition,
  ControlDefinitionExtension,
  ControlRenderOptions,
  createFormRenderer,
  createFormTree,
  createSchemaLookup,
  createSchemaTree,
  EditorGroup,
  fontAwesomeIcon,
  FormNode,
  FormRenderer,
  FormTree,
  getAllReferencedClasses,
  IconPlacement,
  LabelType,
  RendererRegistration,
  SchemaField,
} from "@react-typed-forms/schemas";
import React, {
  ReactElement,
  ReactNode,
  useMemo,
  useRef,
  useState,
  Fragment,
} from "react";
import {
  createTailwindcss,
  TailwindConfig,
} from "@mhsdesign/jit-browser-tailwindcss";
import defaultEditorControls from "./ControlDefinition.json";
import defaultSchemaEditorControls from "./SchemaField.json";
import { createView, getTabTitle, getViewAndParams } from "./views";
import {
  Actions,
  DockLocation,
  IJsonTabNode,
  Layout,
  Model,
  TabNode,
  TabSetNode,
} from "flexlayout-react";
import { defaultLayout } from "./defaultLayout";
import { setIncluded } from "@astroapps/client";
import {
  BasicFormEditorViewContext,
  EditableForm,
  FormInfo,
  FormLoader,
  PreviewData,
  SchemaLoader,
  Snippet,
} from "./types";
import { EditorFormTree } from "./EditorFormTree";
import { EditorSchemaTree } from "./EditorSchemaTree";

export interface BasicFormEditorProps<A extends string> {
  formRenderer: FormRenderer;
  createEditorRenderer?: (renderers: RendererRegistration[]) => FormRenderer;
  loadForm: FormLoader<A>;
  loadSchema: SchemaLoader;
  selectedForm?: Control<A | undefined>;
  formTypes: [string, string][] | FormInfo[];
  listHeader?: ReactNode;
  saveForm: (
    controls: ControlDefinition[],
    formId: A,
    config: any,
    formFields: SchemaField[],
  ) => Promise<any>;
  saveSchema?: (controls: SchemaField[], schemaId: string) => Promise<any>;
  validation?: (data: Control<any>, controls: FormNode) => Promise<any>;
  extensions?: ControlDefinitionExtension[];
  editorControls?: ControlDefinition[];
  schemaEditorControls?: ControlDefinition[];
  previewOptions?: ControlRenderOptions;
  setupPreview?: (previewData: Control<PreviewData>) => void;
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
  snippets?: Snippet[];
}

export function BasicFormEditor<A extends string = string>({
  formRenderer,
  selectedForm: sf,
  loadForm,
  loadSchema,
  createEditorRenderer = (e) =>
    createFormRenderer(e, createDefaultRenderers(defaultTailwindTheme)),
  formTypes,
  listHeader,
  validation,
  saveForm,
  saveSchema,
  extensions: _extensions,
  editorControls,
  schemaEditorControls,
  previewOptions,
  setupPreview,
  tailwindConfig,
  editorPanelClass = "p-4",
  editorClass,
  rootControlClass,
  collectClasses,
  controlsClass,
  handleIcon,
  extraPreviewControls,
  snippets,
}: BasicFormEditorProps<A>): ReactElement {
  const selectedForm = useControl<A | undefined>(undefined, { use: sf });
  const extensions = useMemo(
    () => [...(_extensions ?? []), ValueForFieldExtension],
    [_extensions],
  );
  const controlSchemas = useMemo(
    () =>
      createSchemaLookup(
        applyExtensionsToSchema(ControlDefinitionSchemaMap, extensions ?? []),
      ),
    [extensions],
  );
  const SchemaFieldTree = controlSchemas.getSchema("SchemaField");
  const ControlDefinitionTree = controlSchemas.getSchema("ControlDefinition");
  const [model] = useState(() => Model.fromJson(defaultLayout));

  const editorFormRenderer = useMemo(
    () =>
      createEditorRenderer([
        formButtonRenderer("collapse", "minimize"),
        formButtonRenderer("add", "plus"),
        formButtonRenderer("cut", "cut"),
        formButtonRenderer("copy", "copy"),
        formButtonRenderer("paste", "paste"),
      ]),
    [],
  );
  const dockRef = useRef<Layout | null>(null);
  const loadedForms = useControl<Record<string, EditableForm | undefined>>({});
  const loadedSchemas = useControl<Record<string, SchemaField[] | undefined>>(
    {},
  );
  const loadedFormNames = useControl<string[]>([]);
  const schemaEditorTree: FormTree = useMemo(() => {
    return createFormTree(
      addMissingControlsForSchema(
        SchemaFieldTree,
        schemaEditorControls ?? defaultSchemaEditorControls,
        (m) => console.warn(m),
      ),
    );
  }, [schemaEditorControls, controlSchemas, defaultSchemaEditorControls]);

  const editorTree: FormTree = useMemo(() => {
    const tree = new EditorFormTree(editorControls ?? defaultEditorControls);
    const extraGroups: EditorGroup[] = extensions.flatMap((x) =>
      Object.values(x).flatMap((ro) =>
        Array.isArray(ro)
          ? ro.flatMap((r) => r.groups ?? [])
          : (ro.groups ?? []),
      ),
    );
    extraGroups.forEach((g) => {
      const parent = tree.getNodeByRefId(g.parent);
      if (parent) {
        tree.addNode(parent, g.group);
      } else {
        console.warn("Could not find parent group: ", g.parent);
      }
    });
    const allNodes = addMissingControlsForSchema(
      ControlDefinitionTree,
      tree.getRootDefinitions().value,
      (m) => console.warn(m),
    );
    return createFormTree(allNodes);
  }, [editorControls, controlSchemas, defaultEditorControls]);

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
    return loadedFormNames.value
      .flatMap((x) => {
        const lf = loadedForms.fields[x];
        const rn = lf.fields.formTree.value?.rootNode.definition;
        return rn ? [rn] : [];
      })
      .flatMap((x) => getAllReferencedClasses(x, collectClasses))
      .join(" ");
  });

  const styles = useControl("");

  async function runTailwind(classes: string) {
    const html = `<div class="${classes}"></div>`;
    styles.value = await genStyles.generateStylesFromContent(
      `@tailwind utilities;`,
      [html],
    );
  }

  useControlEffect(
    () => allClasses.value,
    (cv) => runTailwind(cv),
    true,
  );

  function button(onClick: () => void, action: string, actionId?: string) {
    return editorFormRenderer.renderAction({
      onClick,
      actionText: action,
      actionId: actionId ?? action,
    });
  }

  function checkbox(
    control: Control<boolean | null | undefined>,
    text: string,
  ) {
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

  async function doSaveSchema(c: Control<EditableForm>) {
    if (saveSchema) {
      const schemaTree = getSchema(c.fields.schemaName.value);
      await saveSchema(
        schemaTree
          .getRootFields()
          .value.map((c) => cleanDataForSchema(c, SchemaFieldTree, true)) ?? [],
        schemaTree.schemaId,
      );

      c.fields.formTree.markAsClean();
    }
  }

  async function doSaveForm(c: Control<EditableForm>) {
    await saveForm(
      c.fields.formTree.value
        .getRootDefinitions()
        .value.map((c) => cleanDataForSchema(c, ControlDefinitionTree, true)) ??
        [],
      c.fields.formId.value as A,
      c.fields.config.value,
      c.fields.formSchema.value,
    );
    c.fields.formTree.markAsClean();
    c.fields.config.markAsClean();
  }

  const formList = formTypes.map((e) =>
    Array.isArray(e) ? { id: e[0], name: e[1] } : e,
  );
  const viewContext: BasicFormEditorViewContext = {
    validation,
    previewOptions,
    button,
    currentForm: selectedForm.as(),
    getForm,
    listHeader,
    extraPreviewControls,
    editorPanelClass,
    getCurrentForm: () =>
      selectedForm.value ? getForm(selectedForm.value) : undefined,
    extensions,
    setupPreview,
    editorControls: editorTree,
    schemaEditorControls: schemaEditorTree,
    createEditorRenderer,
    editorFields: ControlDefinitionTree,
    schemaEditorFields: SchemaFieldTree,
    editorFormRenderer,
    formList,
    openForm,
    updateTabTitle,
    saveForm: doSaveForm,
    saveSchema: saveSchema ? doSaveSchema : undefined,
    checkbox,
    snippets,
    getSchemaForForm,
  };

  return (
    <>
      <RenderControl render={() => <style>{styles.value}</style>} />
      <Layout
        ref={dockRef}
        model={model}
        factory={renderTab}
        realtimeResize
        onModelChange={(m, a) => {
          const docNode = model.getNodeById("documents") as TabSetNode;
          const formNode = docNode.getSelectedNode() as TabNode | undefined;
          if (formNode) {
            const [viewId, param] = getViewAndParams(formNode.getId());
            selectedForm.value = param as A;
          } else selectedForm.value = undefined;
        }}
      />
    </>
  );

  function renderTab(node: TabNode) {
    return createView(node.getId(), viewContext).content;
  }

  function updateTabTitle(tabId: string, title: string) {
    model.doAction(Actions.updateNodeAttributes(tabId, { name: title }));
  }

  function getForm(formId: string) {
    const form = loadedForms.fields[formId];
    ensureMetaValue(form, "loader", async () => {
      await loadFormNode(formId, form);
      loadedFormNames.setValue((x) => setIncluded(x, formId, true));
    });
    return form;
  }

  function getSchemaForForm(form: Control<EditableForm>) {
    const schemaName = form.fields.schemaName.value;
    const schemaFields = ensureSchema(form.fields.schemaName.value);
    return new EditorSchemaTree(
      schemaFields,
      schemaName,
      getSchema,
      form.fields.formSchema,
    );
  }

  function getSchema(schemaId: string): EditorSchemaTree {
    const fields = ensureSchema(schemaId);
    return new EditorSchemaTree(fields, schemaId, getSchema);
  }

  function ensureSchema(schemaId: string): Control<SchemaField[]> {
    const schemaControl = loadedSchemas.fields[schemaId];
    if (schemaControl.isNull) {
      schemaControl.value = [];
      doLoadSchema(schemaControl);
    }
    return schemaControl.as();

    async function doLoadSchema(tree: Control<SchemaField[] | undefined>) {
      const { fields } = await loadSchema(schemaId);
      tree.setInitialValue(fields);
    }
  }

  function openForm(formId: string) {
    const tabId = "form:" + formId;
    const existingTab = model.getNodeById(tabId);
    if (existingTab) {
      model.doAction(Actions.selectTab(tabId));
    } else {
      model.doAction(
        Actions.addNode(
          {
            type: "tab",
            id: tabId,
            name: getTabTitle("form", formId),
            enableClose: true,
          } satisfies IJsonTabNode,
          "documents",
          DockLocation.CENTER,
          0,
        ),
      );
    }
  }

  async function loadFormNode(
    formId: string,
    control: Control<EditableForm | undefined>,
  ) {
    const name = formList.find((x) => x.id === formId)?.name ?? formId;
    const res = await loadForm(formId as A);
    control.setInitialValue({
      formTree: new EditorFormTree(res.controls),
      schemaName: res.schemaName,
      hideFields: false,
      renderer: res.renderer ?? formRenderer,
      formId,
      name,
      config: res.config,
      formSchema: res.formFields ?? [],
      configOptions: res.configOptions,
      configSchema: res.configSchema
        ? createSchemaTree(res.configSchema).rootNode
        : undefined,
    });
  }

  function formButtonRenderer(
    actionId: string,
    icon: string,
  ): RendererRegistration {
    return createButtonActionRenderer(actionId, {
      ...defaultTailwindTheme.action,
      iconPlacement: IconPlacement.ReplaceText,
      icon: fontAwesomeIcon(icon),
    });
  }
}
