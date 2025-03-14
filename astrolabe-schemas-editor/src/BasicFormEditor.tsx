import {
  Control,
  ensureMetaValue,
  Fcheckbox,
  newControl,
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
import { ControlDefinitionSchemaMap } from "./schemaSchemas";
import {
  addMissingControlsToForm,
  applyExtensionsToSchema,
  cleanDataForSchema,
  ControlDefinition,
  ControlDefinitionExtension,
  ControlDefinitionType,
  ControlRenderOptions,
  createFormRenderer,
  createFormTree,
  EditorGroup,
  FormNode,
  FormRenderer,
  FormTree,
  getAllReferencedClasses,
  GroupRenderType,
  LabelType,
  RendererRegistration,
  rootSchemaNode,
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

export interface BasicFormEditorProps<A extends string> {
  formRenderer: FormRenderer;
  createEditorRenderer?: (renderers: RendererRegistration[]) => FormRenderer;
  schemas: SchemaTreeLookup;
  loadForm: (formId: A) => Promise<{
    controls: ControlDefinition[];
    schemaName: string;
    renderer?: FormRenderer;
  }>;
  selectedForm?: Control<A | undefined>;
  formTypes: [string, string][] | FormInfo[];
  saveForm: (controls: ControlDefinition[], formId: A) => Promise<any>;
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

export function BasicFormEditor<A extends string = string>({
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
  const selectedForm = useControl<A | undefined>(undefined, { use: sf });
  const extensions = useMemo(
    () => [...(_extensions ?? []), ValueForFieldExtension],
    [_extensions],
  );
  const controlDefinitionSchemaMap = useMemo(
    () => applyExtensionsToSchema(ControlDefinitionSchemaMap, extensions ?? []),
    [extensions],
  );
  const [model] = useState(() => Model.fromJson(defaultLayout));

  const editorFormRenderer = useMemo(() => createEditorRenderer([]), []);
  const dockRef = useRef<Layout | null>(null);
  const loadedForms = useControl<Record<string, EditableForm | undefined>>({});
  const ControlDefinitionSchema = controlDefinitionSchemaMap.ControlDefinition;
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
    addMissingControlsToForm(
      rootSchemaNode(ControlDefinitionSchema),
      tree,
      (m) => console.warn(m),
    );
    return tree;
  }, [editorControls, controlDefinitionSchemaMap, defaultEditorControls]);

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
    return Object.values(loadedForms.fields)
      .flatMap((x) => {
        const rn = x.value?.formTree.root;
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
        cleanDataForSchema(c, ControlDefinitionSchema, true),
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
    schemaLookup: schemas,
    getForm,
    extraPreviewControls,
    editorPanelClass,
    getCurrentForm: () =>
      selectedForm.value ? getForm(selectedForm.value) : undefined,
    extensions,
    editorControls: editorTree,
    createEditorRenderer,
    editorFields: rootSchemaNode(ControlDefinitionSchema),
    formList,
    openForm,
    updateTabTitle,
    saveForm: doSaveForm,
    checkbox,
  };

  return (
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
  );

  function renderTab(node: TabNode) {
    return createView(node.getId(), viewContext).content;
  }

  function updateTabTitle(tabId: string, title: string) {
    model.doAction(Actions.updateNodeAttributes(tabId, { name: title }));
  }

  function getForm(formId: string) {
    const form = loadedForms.fields[formId];
    ensureMetaValue(form, "loader", () => loadFormNode(formId, form));
    return form;
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
    control.setInitialValue({
      formTree,
      schemaId: res.schemaName,
      hideFields: false,
      renderer: res.renderer ?? formRenderer,
      formId,
      name,
    });
  }
}
