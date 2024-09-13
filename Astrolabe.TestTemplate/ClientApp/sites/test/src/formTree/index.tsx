import { Control } from "@react-typed-forms/core";
import {
  CompoundField,
  ControlDefinition,
  ControlDefinitionType,
  ControlRenderer,
  FieldType,
  isCompoundField,
  isDataControlDefinition,
  SchemaField,
} from "@react-typed-forms/schemas";
import { createContext } from "react";

export interface FormNode {
  definition: ControlDefinition;
  getChildNodes(): FormNode[];
  parent?: FormNode;
}

export interface FormTreeLookup<A = string> {
  getForm(formId: A): FormTreeNode | undefined;
}
export interface FormTreeNode extends FormTreeLookup {
  rootNode: FormNode;
}

export interface SchemaTreeLookup<A = string> {
  getSchema(schemaId: A): SchemaNode | undefined;
}

export interface SchemaNode extends SchemaTreeLookup {
  field: SchemaField;
  getChildNode(field: string): SchemaNode | undefined;
  getChildNodes(): SchemaNode[];
  parent?: SchemaNode;
}

export interface SchemaDataNode {
  schema: SchemaNode;
  elementIndex?: number;
  control?: Control<unknown>;
  parent?: SchemaDataNode;
  getChild(node: SchemaNode): SchemaDataNode;
  getChildElement(index: number): SchemaDataNode;
}

function nodeForSchema(
  field: SchemaField,
  lookup: SchemaTreeLookup,
  parent: SchemaNode | undefined,
): SchemaNode {
  const node = {
    field,
    getSchema: lookup.getSchema,
    parent,
    getChildNode,
    getChildNodes,
  };
  return node;

  function getChildNode(fieldName: string) {
    if (isCompoundField(field) && !field.schemaRef) {
      const childField = field.children.find((x) => x.field === fieldName);
      return childField ? nodeForSchema(childField, lookup, node) : undefined;
    }
    return getChildNodes().find((x) => x.field.field === fieldName);
  }
  function getChildNodes(): SchemaNode[] {
    if (isCompoundField(field)) {
      const otherRef = field.schemaRef && lookup.getSchema(field.schemaRef);
      if (otherRef) return otherRef.getChildNodes();
      return field.children.map((x) => nodeForSchema(x, lookup, node));
    }
    return [];
  }
}

export function createSchemaLookup<A extends Record<string, SchemaField[]>>(
  schemaMap: A,
): SchemaTreeLookup<keyof A> {
  const lookup = {
    getSchema,
  };
  return lookup;

  function getSchema(schemaId: keyof A): SchemaNode | undefined {
    const fields = schemaMap[schemaId];
    if (fields) {
      return nodeForSchema(
        {
          type: FieldType.Compound,
          field: "",
          children: fields,
        } as CompoundField,
        lookup,
        undefined,
      );
    }
    return undefined;
  }
}

function nodeForControl(
  definition: ControlDefinition,
  parent?: FormNode,
): FormNode {
  const node = { definition, parent, getChildNodes };
  return node;
  function getChildNodes(): FormNode[] {
    return definition.children?.map((x) => nodeForControl(x, node)) ?? [];
  }
}
export function createFormLookup<A extends Record<string, ControlDefinition[]>>(
  formMap: A,
): FormTreeLookup<keyof A> {
  const lookup = {
    getForm,
  };
  return lookup;

  function getForm(formId: keyof A): FormTreeNode | undefined {
    const controls = formMap[formId];
    if (controls) {
      return {
        rootNode: nodeForControl({
          children: controls,
          type: ControlDefinitionType.Group,
        }),
        getForm,
      };
    }
    return undefined;
  }
}

export function schemaDataNode(
  schema: SchemaNode,
  control?: Control<unknown>,
  parent?: SchemaDataNode,
  elementIndex?: number,
): SchemaDataNode {
  const dataNode = {
    schema,
    control,
    parent,
    elementIndex,
    getChild,
    getChildElement,
  };
  return dataNode;

  function getChild(schemaNode: SchemaNode): SchemaDataNode {
    return schemaDataNode(
      schemaNode,
      (control as Control<Record<string, unknown>>)?.fields?.[
        schemaNode.field.field
      ],
      dataNode,
    );
  }
  function getChildElement(elementIndex: number): SchemaDataNode {
    return schemaDataNode(
      schema,
      (control as Control<unknown[]>)?.elements?.[elementIndex],
      dataNode,
      elementIndex,
    );
  }
}

export function schemaDataForForm(
  { definition }: FormNode,
  schema: SchemaDataNode,
): SchemaDataNode {
  const fieldPath = isDataControlDefinition(definition)
    ? definition.field.split("/")
    : [];
  let i = 0;
  while (i < fieldPath.length) {
    const nextField = fieldPath[i];
    const childNode = schema.schema.getChildNode(nextField);
    if (!childNode) {
      throw "Missing: " + nextField;
    }
    schema = schema.getChild(childNode);
    i++;
  }
  return schema;
}

export const RenderFormContext = createContext(ControlRenderer);
