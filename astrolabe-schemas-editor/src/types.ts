import { Control } from "@react-typed-forms/core";
import { ControlDefinitionForm } from "./schemaSchemas";
import {
  ControlDefinition,
  FormNode,
  SchemaNode,
} from "@react-typed-forms/schemas";

export interface ControlNode extends SelectedControlNode {
  id: string;
  children: ControlNode[] | null;
}

export type SelectedControlNode = {
  form: FormNode;
  schema: SchemaNode;
};
