import { Control } from "@react-typed-forms/core";
import {ControlDefinition, SchemaField} from "@react-typed-forms/schemas"

export interface FormNode {
    definition: ControlDefinition;
    getChildNodes(): FormNode[];
    parent?: FormNode;
}

export interface FormTreeNode {
    rootNode: FormNode;
    getForm(formId: string): FormTreeNode;
}

export interface SchemaNode {
    field: SchemaField;
    getChildNodes(): SchemaNode[];
    parent?: SchemaNode;
}

export interface SchemaDataNode {
    schema: SchemaNode;
    elementIndex?: number;
    control: Control<unknown>;
    parent?: SchemaDataNode;
    getChild(node: SchemaNode) : SchemaDataNode;
    getChildElement(index: number) : SchemaDataNode;
}