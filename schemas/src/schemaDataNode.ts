import { Control, newControl } from "@react-typed-forms/core";
import { missingField } from "./schemaField";
import { createSchemaNode, resolveSchemaNode, SchemaNode } from "./schemaNode";

export abstract class SchemaDataTree {
  abstract rootNode: SchemaDataNode;

  abstract getChild(parent: SchemaDataNode, child: SchemaNode): SchemaDataNode;

  abstract getChildElement(
    parent: SchemaDataNode,
    elementIndex: number,
  ): SchemaDataNode;
}

export class SchemaDataNode {
  constructor(
    public id: string,
    public schema: SchemaNode,
    public elementIndex: number | undefined,
    public control: Control<any>,
    public tree: SchemaDataTree,
    public parent?: SchemaDataNode,
  ) {}

  getChild(childNode: SchemaNode): SchemaDataNode {
    return this.tree.getChild(this, childNode);
  }

  getChildElement(elementIndex: number): SchemaDataNode {
    return this.tree.getChildElement(this, elementIndex);
  }
}

export class SchemaDataTreeImpl extends SchemaDataTree {
  rootNode: SchemaDataNode;

  constructor(rootSchema: SchemaNode, rootControl: Control<any>) {
    super();
    this.rootNode = new SchemaDataNode(
      "",
      rootSchema,
      undefined,
      rootControl,
      this,
    );
  }

  getChild(parent: SchemaDataNode, childNode: SchemaNode): SchemaDataNode {
    const objControl = parent.control as Control<Record<string, unknown>>;
    return new SchemaDataNode(
      parent.id + "/" + childNode.field.field,
      childNode,
      undefined,
      objControl.fields[childNode.field.field],
      this,
      parent,
    );
  }

  getChildElement(
    parent: SchemaDataNode,
    elementIndex: number,
  ): SchemaDataNode {
    const elemControl = parent.control as Control<unknown[]>;
    return new SchemaDataNode(
      parent.id + "/" + elementIndex,
      parent.schema,
      elementIndex,
      elemControl.elements[elementIndex],
      this,
      parent,
    );
  }
}

/**
 * @deprecated Use createSchemaDataNode instead.
 */
export const makeSchemaDataNode = createSchemaDataNode;

export function createSchemaDataNode(
  schema: SchemaNode,
  control: Control<unknown>,
): SchemaDataNode {
  return new SchemaDataTreeImpl(schema, control).rootNode;
}

export function schemaDataForFieldRef(
  fieldRef: string | undefined,
  schema: SchemaDataNode,
): SchemaDataNode {
  return schemaDataForFieldPath(fieldRef?.split("/") ?? [], schema);
}

export function schemaDataForFieldPath(
  fieldPath: string[],
  dataNode: SchemaDataNode,
): SchemaDataNode {
  let i = 0;
  while (i < fieldPath.length) {
    const nextField = fieldPath[i];
    let nextNode =
      nextField === ".."
        ? dataNode.parent
        : nextField === "."
          ? dataNode
          : lookupField(nextField);
    nextNode ??= createSchemaDataNode(
      createSchemaNode(
        missingField(nextField),
        dataNode.schema.tree,
        dataNode.schema,
      ),
      newControl(undefined),
    );
    dataNode = nextNode;
    i++;
  }
  return dataNode;

  function lookupField(field: string): SchemaDataNode | undefined {
    const childNode = resolveSchemaNode(dataNode.schema, field);
    if (childNode) {
      return dataNode.getChild(childNode);
    }
    return undefined;
  }
}
