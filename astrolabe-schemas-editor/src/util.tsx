import { Control } from "@react-typed-forms/core";
import {
  ActionControlDefinition,
  ActionStyle,
  ControlDefinition,
  ControlDefinitionType,
  FieldOption,
  FieldType,
  isCompoundField,
  isCompoundNode,
  SchemaField,
  SchemaMap,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { ControlDefinitionForm, SchemaFieldForm } from "./schemaSchemas";
import { ReactElement } from "react";
import { SchemaLoader } from "./types";

export type ControlForm = Control<ControlDefinitionForm>;

export interface ControlDragState {
  draggedFrom?: [Control<any>, number];
  targetIndex: number;
  draggedControl: ControlForm;
  targetParent: ControlForm;
  dragFields?: Control<SchemaFieldForm[]>;
}

export interface DragData {
  overlay: (dd: DragData) => ReactElement;
}

export interface DropData {
  success: (drag: DragData, drop: DropData) => void;
}

export interface ControlDropData extends DropData {
  parent?: ControlForm;
  dropIndex: number;
}

export enum SchemaOptionTag {
  SchemaField = "_SchemaField",
  NestedSchemaField = "_NestedSchemaField",
  HtmlEditor = "_HtmlEditor",
}
export function controlDropData(
  parent: ControlForm | undefined,
  dropIndex: number,
  dropSuccess: (drag: DragData, drop: DropData) => void,
): ControlDropData {
  return {
    dropIndex,
    parent,
    success: dropSuccess,
  };
}

function schemaFieldOption(c: SchemaField, prefix?: string): FieldOption {
  const value = (prefix ?? "") + c.field;
  return { name: `${c.displayName ?? c.field} (${value})`, value };
}

export function schemaFieldOptions(
  c: SchemaField,
  prefix?: string,
): FieldOption[] {
  const self = schemaFieldOption(c, prefix);
  if (isCompoundField(c) && !c.collection) {
    const newPrefix = (prefix ?? "") + c.field + "/";
    return [
      self,
      ...c.children.flatMap((x) => schemaFieldOptions(x, newPrefix)),
    ];
  }
  return [self];
}
export function controlIsGroupControl(c: Control<ControlDefinitionForm>) {
  return c.fields.type.value === ControlDefinitionType.Group;
}

export function controlIsCompoundField(c: Control<SchemaFieldForm>) {
  return c.fields.type.value === FieldType.Compound;
}

export function schemaNodeIcon(t: string) {
  switch (t) {
    case FieldType.String:
      return "fa-text";
    case FieldType.Int:
    case FieldType.Double:
      return "fa-0";
    case FieldType.Compound:
      return "fa-brackets-curly";
    case FieldType.Bool:
      return "fa-y";
    default:
      return "fa-question";
  }
}

export function canAddChildren(x: ControlDefinition, dataNode?: SchemaNode) {
  switch (x.type) {
    case ControlDefinitionType.Group:
      return true;
    case ControlDefinitionType.Action:
      return (x as ActionControlDefinition).actionStyle === ActionStyle.Group;
    case ControlDefinitionType.Display:
      return false;
    case ControlDefinitionType.Data:
      return !dataNode || isCompoundNode(dataNode) || dataNode.field.collection;
    default:
      return true;
  }
}

export function readOnlySchemas(schemas: SchemaMap): SchemaLoader {
  return async (schemaId: string) => {
    const fields = schemas[schemaId];
    return { fields };
  };
}
