import React, { ReactElement, useMemo } from "react";
import {
  ControlDefinitionExtension,
  CustomRenderOptions,
  DataRenderType,
  DefaultSchemaInterface,
  fieldHasTag,
  FieldOption,
  fieldPathForDefinition,
  FieldType,
  FormRenderer,
  getSchemaNodePath,
  GroupedControlsDefinition,
  makeSchemaDataNode,
  schemaDataForFieldPath,
  SchemaDataNode,
  schemaForFieldPath,
  SchemaNode,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import { SelectedControlNode } from "./types";
import { schemaFieldOptions, SchemaOptionTag } from "./util";
import { ControlDefinitionForm } from "./schemaSchemas";
import { Control, trackedValue } from "@react-typed-forms/core";

type ExtensionTypeFilterMap = { [key: string]: (n: SchemaNode) => boolean };

type ExtensionFilters = Record<
  keyof ControlDefinitionExtension,
  ExtensionTypeFilterMap
>;
export function FormControlEditor({
  controlNode,
  renderer,
  editorFields,
  editorControls,
  extensions,
}: {
  controlNode: SelectedControlNode;
  editorControls: GroupedControlsDefinition;
  editorFields: SchemaNode;
  renderer: FormRenderer;
  extensions?: ControlDefinitionExtension[];
}): ReactElement {
  const extensionFilters = useMemo(() => {
    const appliesMap = {} as ExtensionFilters;
    extensions?.forEach((x) => {
      Object.entries(x).forEach(([field, cro]) => {
        const cdf = field as keyof ControlDefinitionExtension;
        let ap = appliesMap[cdf];
        if (!ap) {
          ap = {};
          appliesMap[cdf] = ap;
        }
        (Array.isArray(cro) ? cro : [cro]).forEach((cr) => addApplies(ap, cr));
      });
    });
    return appliesMap;
  }, [extensions]);
  const schemaInterface = useMemo(
    () => new EditorSchemaInterface(controlNode.schema, extensionFilters),
    [controlNode.schema, extensionFilters],
  );
  // const useDataHook = useEditorDataHook(controlNode.schema);
  const editorNode = makeSchemaDataNode(editorFields, controlNode.control);
  const RenderEditor = useControlRendererComponent(
    editorControls,
    renderer,
    {
      schemaInterface,
    },
    editorNode,
  );
  return <RenderEditor />;
}

function addApplies(
  appliesMap: { [key: string]: (n: SchemaNode) => boolean },
  extension: CustomRenderOptions,
) {
  const applies = extension.applies;
  if (applies) {
    const value = extension.value;
    const origApplies = appliesMap[value];
    appliesMap[value] = origApplies
      ? (n: SchemaNode) => origApplies(n) && applies(n)
      : applies;
  }
}

class EditorSchemaInterface extends DefaultSchemaInterface {
  constructor(
    private schemaNode: SchemaNode,
    private appliesMap: ExtensionFilters,
  ) {
    super();
  }

  getDataOptions(node: SchemaDataNode): FieldOption[] | null | undefined {
    const isField = fieldHasTag(node.schema.field, SchemaOptionTag.SchemaField);
    if (isField) {
      return this.schemaNode
        .getChildNodes()
        .map((x) => x.field)
        .flatMap((x) => schemaFieldOptions(x));
    }
    const original = super.getDataOptions(node);
    if (node.id === "/renderOptions/type" && original) {
      const definitionControl = node.parent?.parent?.control as
        | Control<ControlDefinitionForm>
        | undefined;
      if (definitionControl) {
        const path = definitionControl
          ? fieldPathForDefinition(trackedValue(definitionControl))
          : undefined;
        const dataNode = path
          ? schemaForFieldPath(path, this.schemaNode)
          : undefined;
        return dataNode
          ? original
              .filter(defaultRenderOptionsFilter(dataNode, definitionControl))
              .sort((a, b) => a.name.localeCompare(b.name))
          : original;
      }
    }
    return original;
  }
}

function defaultRenderOptionsFilter(
  node: SchemaNode,
  control: Control<ControlDefinitionForm>,
) {
  const field = node.field;
  const fieldType = field.type;
  return (x: FieldOption) => {
    switch (x.value) {
      case DataRenderType.HtmlEditor:
      case DataRenderType.UserSelection:
      case DataRenderType.IconList:
      case DataRenderType.IconSelector:
        return fieldType === FieldType.String;
      case DataRenderType.Array:
      case DataRenderType.CheckList:
        return !!field.collection;
      case DataRenderType.Checkbox:
        return fieldType === FieldType.Bool;
      case DataRenderType.DateTime:
        return (
          fieldType === FieldType.DateTime ||
          fieldType === FieldType.Date ||
          fieldType === FieldType.Time
        );
      case DataRenderType.Group:
        return field.type === FieldType.Compound;
      default:
        return true;
    }
  };
}
