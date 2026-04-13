import { Control, Fcheckbox } from "@react-typed-forms/core";
import {
  createButtonActionRenderer,
  createDefaultRenderers,
  DefaultRendererOptions,
  defaultTailwindTheme,
  ValueForFieldExtension,
} from "@react-typed-forms/schemas-html";
import { ControlDefinitionSchemaMap } from "@react-typed-forms/schemas";
import {
  addMissingControlsForSchema,
  applyExtensionsToSchema,
  ControlDefinition,
  ControlDefinitionExtension,
  createFormRenderer,
  createFormTree,
  createSchemaLookup,
  deepMerge,
  EditorGroup,
  fontAwesomeIcon,
  FormRenderer,
  FormTree,
  FormTreeLookup,
  IconPlacement,
  LabelType,
  RendererRegistration,
} from "@react-typed-forms/schemas";
import React, { ReactNode, useMemo } from "react";
import defaultEditorControls from "./ControlDefinition.json";
import defaultSchemaEditorControls from "./SchemaField.json";
import expressionFormControls from "./ExpressionForm.json";
import { EditableForm, ViewContext } from "./types";
import { EditorFormTree } from "./EditorFormTree";
import { EditorSchemaTree } from "./EditorSchemaTree";

export interface UseViewContextConfig {
  getCurrentForm: () => Control<EditableForm | undefined> | undefined;
  getSchemaForForm: (form: Control<EditableForm>) => EditorSchemaTree;
  extensions?: ControlDefinitionExtension[];
  editorControls?: ControlDefinition[];
  schemaEditorControls?: ControlDefinition[];
  externalForms?: Record<string, ControlDefinition[]>;
  createEditorRenderer?: (registrations: RendererRegistration[]) => FormRenderer;
  editorPanelClass?: string;
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

export function useViewContext({
  getCurrentForm,
  getSchemaForForm,
  extensions: _extensions,
  editorControls,
  schemaEditorControls,
  externalForms: _externalForms,
  createEditorRenderer = (e) =>
    createFormRenderer(
      e,
      createDefaultRenderers(
        deepMerge<DefaultRendererOptions>(
          {
            label: {
              labelContainer: (c) => (
                <div className="flex items-center gap-1">{c}</div>
              ),
            },
          },
          defaultTailwindTheme,
        ),
      ),
    ),
  editorPanelClass = "p-4",
}: UseViewContextConfig): ViewContext {
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
    const mergedExternalForms: Record<string, ControlDefinition[]> = {
      ExpressionForm: expressionFormControls,
      ...(_externalForms ?? {}),
    };
    const tree = new EditorFormTree(
      editorControls ?? defaultEditorControls,
      mergedExternalForms,
    );
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
    const formLookup: FormTreeLookup = {
      getForm(formId: string) {
        const controls = mergedExternalForms[formId];
        return controls ? createFormTree(controls, this) : undefined;
      },
    };
    return createFormTree(allNodes, formLookup);
  }, [editorControls, controlSchemas, defaultEditorControls, _externalForms]);

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

  return {
    editorControls: editorTree,
    schemaEditorControls: schemaEditorTree,
    editorFields: ControlDefinitionTree,
    schemaEditorFields: SchemaFieldTree,
    createEditorRenderer,
    editorFormRenderer,
    button,
    checkbox,
    extensions,
    editorPanelClass,
    getCurrentForm,
    getSchemaForForm,
  };
}
