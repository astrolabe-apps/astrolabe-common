import { Control, newControl } from "@react-typed-forms/core";
import {
  ActionControlDefinition,
  ControlDefinition,
  ControlDefinitionType,
  CreateDataProps,
  defaultDataProps,
  FieldOption,
  FieldType,
  getSchemaFieldList,
  isCompoundField,
  schemaDataForFieldRef,
  SchemaField,
  schemaForFieldRef,
  SchemaNode,
  useUpdatedRef,
} from "@react-typed-forms/schemas";
import {
  ControlDefinitionForm,
  defaultSchemaFieldForm,
  SchemaFieldForm,
} from "./schemaSchemas";
import { ReactElement, useCallback } from "react";

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
