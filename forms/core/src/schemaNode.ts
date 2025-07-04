import {
  CompoundField,
  FieldType,
  isCompoundField,
  missingField,
  SchemaField,
} from "./schemaField";

export interface SchemaTreeLookup {
  getSchema(schemaId: string): SchemaNode | undefined;

  getSchemaTree(
    schemaId: string,
    additional?: SchemaField[],
  ): SchemaTree | undefined;
}

export abstract class SchemaTree {
  abstract rootNode: SchemaNode;

  abstract getSchemaTree(schemaId: string): SchemaTree | undefined;

  createChildNode(parent: SchemaNode, field: SchemaField): SchemaNode {
    return new SchemaNode(parent.id + "/" + field.field, field, this, parent);
  }

  getSchema(schemaId: string): SchemaNode | undefined {
    return this.getSchemaTree(schemaId)?.rootNode;
  }
}

class SchemaTreeImpl extends SchemaTree {
  rootNode: SchemaNode;

  getSchemaTree(schemaId: string): SchemaTree | undefined {
    return this.lookup?.getSchemaTree(schemaId);
  }

  constructor(
    rootFields: SchemaField[],
    private lookup?: SchemaTreeLookup,
  ) {
    super();
    this.rootNode = new SchemaNode(
      "",
      {
        type: FieldType.Compound,
        field: "",
        children: rootFields,
      } as CompoundField,
      this,
    );
  }
}

export function createSchemaTree(
  rootFields: SchemaField[],
  lookup?: SchemaTreeLookup,
): SchemaTree {
  return new SchemaTreeImpl(rootFields, lookup);
}

export class SchemaNode {
  public constructor(
    public id: string,
    public field: SchemaField,
    public tree: SchemaTree,
    public parent?: SchemaNode,
    private getChildFields?: () => SchemaField[],
  ) {}

  getSchema(schemaId: string): SchemaNode | undefined {
    return this.tree.getSchema(schemaId);
  }

  getUnresolvedFields(): SchemaField[] {
    if (this.getChildFields) return this.getChildFields();
    return isCompoundField(this.field) ? this.field.children : [];
  }

  getResolvedParent(noRecurse?: boolean): SchemaNode | undefined {
    const f = this.field;
    if (!isCompoundField(f)) return undefined;
    const parentNode = f.schemaRef
      ? this.tree.getSchema(f.schemaRef)
      : !noRecurse && f.treeChildren
        ? this.parent?.getResolvedParent()
        : undefined;
    return parentNode ?? this;
  }

  getResolvedFields(): SchemaField[] {
    const resolvedParent = this.getResolvedParent();
    return resolvedParent?.getUnresolvedFields() ?? [];
  }

  getChildNodes(): SchemaNode[] {
    const node = this;
    return node.getResolvedFields().map((x) => node.createChildNode(x));
  }

  getChildField(field: string): SchemaField {
    return (
      this.getResolvedFields().find((x) => x.field === field) ??
      missingField(field)
    );
  }

  createChildNode(field: SchemaField): SchemaNode {
    return this.tree.createChildNode(this, field);
  }

  getChildNode(field: string): SchemaNode {
    return this.createChildNode(this.getChildField(field));
  }
}

export function resolveSchemaNode(
  node: SchemaNode,
  fieldSegment: string,
): SchemaNode | undefined {
  if (fieldSegment == ".") return node;
  if (fieldSegment == "..") return node.parent;
  return node.getChildNode(fieldSegment);
}

export function createSchemaNode(
  field: SchemaField,
  lookup: SchemaTree,
  parent: SchemaNode | undefined,
): SchemaNode {
  return new SchemaNode(
    parent ? parent.id + "/" + field.field : field.field,
    field,
    lookup,
    parent,
  );
}

export function createSchemaLookup<A extends Record<string, SchemaField[]>>(
  schemaMap: A,
): {
  getSchema(schemaId: keyof A): SchemaNode;
  getSchemaTree(schemaId: keyof A, additional?: SchemaField[]): SchemaTree;
} {
  const lookup = {
    getSchemaTree,
    getSchema,
  };
  return lookup;

  function getSchema(schemaId: keyof A): SchemaNode {
    return getSchemaTree(schemaId)!.rootNode;
  }

  function getSchemaTree(
    schemaId: keyof A,
    additional?: SchemaField[],
  ): SchemaTree {
    const fields = schemaMap[schemaId];
    if (fields) {
      return new SchemaTreeImpl(
        additional ? [...fields, ...additional] : fields,
        lookup,
      );
    }
    return undefined!;
  }
}

export function schemaForFieldRef(
  fieldRef: string | undefined,
  schema: SchemaNode,
): SchemaNode {
  return schemaForFieldPath(fieldRef?.split("/") ?? [], schema);
}

export function traverseSchemaPath<A>(
  fieldPath: string[],
  schema: SchemaNode,
  acc: A,
  next: (acc: A, node: SchemaNode) => A,
): A {
  let i = 0;
  while (i < fieldPath.length) {
    const nextField = fieldPath[i];
    let childNode = resolveSchemaNode(schema, nextField);
    if (!childNode) {
      childNode = createSchemaNode(
        missingField(nextField),
        schema.tree,
        schema,
      );
    }
    acc = next(acc, childNode);
    schema = childNode;
    i++;
  }
  return acc;
}

export function traverseData(
  fieldPath: string[],
  root: SchemaNode,
  data: { [k: string]: any },
): unknown {
  return traverseSchemaPath(
    fieldPath,
    root,
    data,
    (acc, n) => acc?.[n.field.field] as any,
  );
}

export function schemaForFieldPath(
  fieldPath: string[],
  schema: SchemaNode,
): SchemaNode {
  let i = 0;
  while (i < fieldPath.length) {
    const nextField = fieldPath[i];
    let childNode = resolveSchemaNode(schema, nextField);
    if (!childNode) {
      childNode = createSchemaNode(
        missingField(nextField),
        schema.tree,
        schema,
      );
    }
    schema = childNode;
    i++;
  }
  return schema;
}

export function schemaForDataPath(
  fieldPath: string[],
  schema: SchemaNode,
): DataPathNode {
  let i = 0;
  let element = schema.field.collection;
  while (i < fieldPath.length) {
    const nextField = fieldPath[i];
    let childNode: SchemaNode | undefined;
    if (nextField == ".") {
      i++;
      continue;
    } else if (nextField == "..") {
      if (element) {
        element = false;
        i++;
        continue;
      }
      childNode = schema.parent;
    } else {
      childNode = schema.getChildNode(nextField);
    }
    if (!childNode) {
      childNode = createSchemaNode(
        missingField(nextField),
        schema.tree,
        schema,
      );
    } else {
      element = childNode.field.collection;
    }
    schema = childNode;
    i++;
  }
  return { node: schema, element: !!element };
}

export function getParentDataPath({
  node,
  element,
}: DataPathNode): DataPathNode | undefined {
  if (element) return { node, element: false };
  const parent = node.parent;
  return parent
    ? { node: parent, element: !!parent.field.collection }
    : undefined;
}

export function getSchemaNodePath(node: SchemaNode) {
  const paths: string[] = [];
  let curNode: SchemaNode | undefined = node;
  while (curNode) {
    paths.push(curNode.field.field);
    curNode = curNode.parent;
  }
  return paths.reverse();
}

export function getSchemaNodePathString(node: SchemaNode) {
  return getSchemaNodePath(node).join("/");
}

export function isCompoundNode(node: SchemaNode) {
  return isCompoundField(node.field);
}

/**
 * Returns the relative path from a parent node to a child node.
 * @param parent
 * @param child
 */
export function relativePath(parent: SchemaNode, child: SchemaNode): string {
  // return the path from child to parent
  if (parent.id === child.id) return ".";

  const parentPath = getSchemaNodePath(parent);
  const childPath = getSchemaNodePath(child);
  return relativeSegmentPath(parentPath, childPath);
}

/**
 * Returns the relative path from a parent node to a child node.
 * @param parentPath
 * @param childPath
 */
export function relativeSegmentPath(
  parentPath: string[],
  childPath: string[],
): string {
  let i = 0;
  while (
    i < parentPath.length &&
    i < childPath.length &&
    parentPath[i] === childPath[i]
  ) {
    i++;
  }

  const upLevels = parentPath.length - i;
  const downPath = childPath.slice(i).join("/");

  return "../".repeat(upLevels) + downPath;
}

export interface DataPathNode {
  node: SchemaNode;
  element: boolean;
}
