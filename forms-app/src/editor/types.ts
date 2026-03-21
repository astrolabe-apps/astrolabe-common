import { ComponentType, ReactNode } from "react";
import {
  ControlDefinition,
  FormNode,
  SchemaField,
} from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";
import {
  EditorFormTree,
  EditorSchemaTree,
  BasicFieldType,
  FieldPaletteProps,
  FormCanvasProps,
  PropertiesPanelProps,
} from "@astroapps/basic-editor";

export type { BasicFieldType } from "@astroapps/basic-editor";

/**
 * All editor components and functions needed by FormsEditorPage.
 */
export interface FormsEditorComponents {
  createEditorFormTree: (
    controls: Control<ControlDefinition[]>,
  ) => EditorFormTree;
  createEditorSchemaTree: (
    fields: Control<SchemaField[]>,
    tableId: string,
    getForm: () => any,
  ) => EditorSchemaTree;
  FieldPalette: ComponentType<FieldPaletteProps>;
  FormCanvas: ComponentType<FormCanvasProps>;
  PropertiesPanel: ComponentType<PropertiesPanelProps>;
  addFieldToForm: (
    formTree: EditorFormTree,
    schemaFields: Control<SchemaField[]>,
    selectedField: Control<FormNode | undefined>,
    type: BasicFieldType,
    pageMode?: boolean,
  ) => void;
  deleteFieldFromForm: (
    formTree: EditorFormTree,
    schemaFields: Control<SchemaField[]>,
    selectedField: Control<FormNode | undefined>,
  ) => void;
  moveFieldInForm: (
    formTree: EditorFormTree,
    source: FormNode,
    targetContainer: FormNode,
    insertBefore: FormNode | null,
    pageMode?: boolean,
  ) => void;
  Popover: ComponentType<{
    content: ReactNode;
    className?: string;
    asChild?: boolean;
    children: ReactNode;
  }>;
  Switch: ComponentType<{
    control: Control<boolean>;
  }>;
}