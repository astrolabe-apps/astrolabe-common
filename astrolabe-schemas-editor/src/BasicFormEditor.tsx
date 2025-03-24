import {
  Control,
  ensureMetaValue,
  Fcheckbox,
  newControl,
  RenderControl,
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
import { ControlDefinitionSchemaMap, toSchemaFieldForm } from "./schemaSchemas";
import {
  addMissingControlsToForm,
  applyExtensionsToSchema,
  cleanDataForSchema,
  compoundField,
  ControlDefinition,
  ControlDefinitionExtension,
  ControlDefinitionType,
  ControlRenderOptions,
  createFormRenderer,
  createFormTree,
  createSchemaLookup,
  EditorGroup,
  FormNode,
  FormRenderer,
  FormTree,
  getAllReferencedClasses,
  GroupRenderType,
  LabelType,
  RendererRegistration,
  SchemaField,
  SchemaNode,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import React, {
  ReactElement,
  ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createTailwindcss,
  TailwindConfig,
} from "@mhsdesign/jit-browser-tailwindcss";
import defaultEditorControls from "./ControlDefinition.json";
import defaultSchemaEditorControls from "./SchemaField.json";
import { EditableForm, FormInfo, getViewAndParams, ViewContext } from "./views";
import { createView, getTabTitle } from "./views/createView";
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
import { EditorFormTree } from "./EditorFormNode";
import { setIncluded } from "@astroapps/client";
import { EditorSchemaTree } from "./EditorSchemaNode";
import { FormLoader, SchemaLoader } from "./types";

export interface BasicFormEditorProps<A extends string> {
  formRenderer: FormRenderer;
  createEditorRenderer?: (renderers: RendererRegistration[]) => FormRenderer;
  loadForm: FormLoader<A>;
  loadSchema: SchemaLoader;
  selectedForm?: Control<A | undefined>;
  formTypes: [string, string][] | FormInfo[];
  saveForm: (controls: ControlDefinition[], formId: A) => Promise<any>;
  validation?: (data: Control<any>, controls: FormNode) => Promise<any>;
  extensions?: ControlDefinitionExtension[];
  editorControls?: ControlDefinition[];
  schemaEditorControls?: ControlDefinition[];
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

export function BasicFormEditor<A extends string = string>({
  formRenderer,
  selectedForm: sf,
  loadForm,
  loadSchema,
  createEditorRenderer = (e) =>
    createFormRenderer(e, createDefaultRenderers(defaultTailwindTheme)),
  formTypes,
  validation,
  saveForm,
  extensions: _extensions,
  editorControls,
  schemaEditorControls,
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
  const SchemaFieldRoot = controlSchemas.getSchema("SchemaField");
  const ControlDefinitionRoot = controlSchemas.getSchema("ControlDefinition");
  const [model] = useState(() => Model.fromJson(defaultLayout));

  const editorFormRenderer = useMemo(() => createEditorRenderer([]), []);
  const dockRef = useRef<Layout | null>(null);
  const loadedForms = useControl<Record<string, EditableForm | undefined>>({});
  const loadedSchemas = useControl<
    Record<string, EditorSchemaTree | undefined>
  >({});
  const loadedFormNames = useControl<string[]>([]);
  const schemaEditorTree: FormTree = useMemo(() => {
    const tree = createFormTree(
      schemaEditorControls ?? defaultSchemaEditorControls,
    );
    addMissingControlsToForm(SchemaFieldRoot, tree, (m) => console.warn(m));
    return tree;
  }, [schemaEditorControls, controlSchemas, defaultSchemaEditorControls]);

  const editorTree: FormTree = useMemo(() => {
    const tree = createFormTree(editorControls ?? defaultEditorControls);
    const extraGroups: EditorGroup[] = extensions.flatMap((x) =>
      Object.values(x).flatMap((ro) =>
        Array.isArray(ro)
          ? ro.flatMap((r) => r.groups ?? [])
          : (ro.groups ?? []),
      ),
    );
    extraGroups.forEach((g) => {
      const parent = tree.getByRefId(g.parent);
      if (parent) {
        tree.addChild(parent, g.group);
      } else {
        console.warn("Could not find parent group: ", g.parent);
      }
    });
    addMissingControlsToForm(ControlDefinitionRoot, tree, (m) =>
      console.warn(m),
    );
    return tree;
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
        const rn = lf.fields.formTree.fields.root.value;
        return rn ? [trackedValue(rn)] : [];
      })
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
      c.fields.formTree.value.root.value.children?.map((c) =>
        cleanDataForSchema(c, ControlDefinitionRoot, true),
      ) ?? [],
      c.fields.formId.value as A,
    );
    c.fields.formTree.value.root.markAsClean();
  }
  const formList = formTypes.map((e) =>
    Array.isArray(e) ? { id: e[0], name: e[1] } : e,
  );
  const viewContext: ViewContext = {
    validation,
    previewOptions,
    button,
    currentForm: selectedForm.as(),
    getForm,
    extraPreviewControls,
    editorPanelClass,
    getCurrentForm: () =>
      selectedForm.value ? getForm(selectedForm.value) : undefined,
    extensions,
    editorControls: editorTree,
    schemaEditorControls: schemaEditorTree,
    createEditorRenderer,
    editorFields: ControlDefinitionRoot,
    schemaEditorFields: SchemaFieldRoot,
    formList,
    openForm,
    updateTabTitle,
    saveForm: doSaveForm,
    checkbox,
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

  function getSchema(schemaId: string): EditorSchemaTree {
    const schemaControl = loadedSchemas.fields[schemaId];
    if (schemaControl.isNull) {
      const tree = new EditorSchemaTree(
        getSchema,
        newControl(toSchemaFieldForm(compoundField("", [])(""))),
      );
      schemaControl.value = tree;
      doLoadSchema(tree);
    }
    return schemaControl.value!;

    async function doLoadSchema(tree: EditorSchemaTree) {
      const { fields } = await loadSchema(schemaId);
      tree.rootNode.control.fields.children.value =
        fields.map(toSchemaFieldForm);
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
    const formTree = new EditorFormTree(
      newControl({
        children: res.controls,
        type: ControlDefinitionType.Group,
        groupOptions: {
          type: GroupRenderType.Standard,
          childLayoutClass: rootControlClass,
          hideTitle: true,
        },
      } as ControlDefinition),
    );
    const tree = getSchema(res.schemaName);
    control.setInitialValue({
      formTree,
      schema: tree.rootNode,
      hideFields: false,
      renderer: res.renderer ?? formRenderer,
      formId,
      name,
    });
  }
}
