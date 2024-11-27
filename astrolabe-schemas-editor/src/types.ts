import { Control } from "@react-typed-forms/core";
import { ControlDefinitionForm } from "./schemaSchemas";
import { SchemaNode } from "@react-typed-forms/schemas";

export interface ControlNode {
  control: Control<ControlDefinitionForm>;
  schema: SchemaNode;
}
