import {
  Control,
  ensureMetaValue,
  newControl,
  updateComputedValue,
} from "@astroapps/controls";
import { missingField } from "./schemaField";
import { createSchemaNode, resolveSchemaNode, SchemaNode } from "./schemaNode";
import { SchemaInterface } from "./schemaInterface";
import { ControlDefinition, getDisplayOnlyOptions } from "./controlDefinition";

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

export function getMetaFields<
  T extends Record<string, any> = Record<string, unknown>,
>(control: Control<any>): Control<T> {
  return ensureMetaValue(
    control,
    "metaFields",
    () => newControl({}) as Control<T>,
  );
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
    let objControl = parent.control as Control<Record<string, unknown>>;
    if (childNode.field.meta) {
      objControl = getMetaFields(objControl);
    }
    const child = objControl.fields[childNode.field.field];
    return new SchemaDataNode(
      child.uniqueId.toString(),
      childNode,
      undefined,
      child,
      this,
      parent,
    );
  }

  getChildElement(
    parent: SchemaDataNode,
    elementIndex: number,
  ): SchemaDataNode {
    const elemControl = parent.control as Control<unknown[]>;
    const elemChild = elemControl.elements[elementIndex];
    return new SchemaDataNode(
      elemChild.uniqueId.toString(),
      parent.schema,
      elementIndex,
      elemChild,
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

export function validDataNode(context: SchemaDataNode): boolean {
  const parent = context.parent;
  if (!parent) return true;
  if (parent.schema.field.collection && parent.elementIndex == null)
    return validDataNode(parent);
  return ensureMetaValue(context.control, "validForSchema", () => {
    const c = newControl(true);
    updateComputedValue(c, () => {
      if (!validDataNode(parent)) return false;
      const types = context.schema.field.onlyForTypes;
      if (types == null || types.length === 0) return true;
      const typeNode = parent.schema
        .getChildNodes()
        .find((x) => x.field.isTypeField);
      if (typeNode == null) {
        console.warn("No type field found for", parent.schema);
        return false;
      }
      const typeField = parent.getChild(typeNode).control as Control<string>;
      return typeField && types.includes(typeField.value);
    });
    return c;
  }).value;
}

export function hideDisplayOnly(
  context: SchemaDataNode,
  schemaInterface: SchemaInterface,
  definition: ControlDefinition,
) {
  const displayOptions = getDisplayOnlyOptions(definition);
  return (
    displayOptions &&
    !displayOptions.emptyText &&
    schemaInterface.isEmptyValue(context.schema.field, context.control?.value)
  );
}
