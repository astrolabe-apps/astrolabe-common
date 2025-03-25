import { SchemaValidator } from "./schemaValidator";
import { Control, ControlSetup, newControl } from "@react-typed-forms/core";

export type EqualityFunc = (a: any, b: any) => boolean;

/**
 * Represents a schema field with various properties.
 */
export interface SchemaField {
  /** The type of the field. */
  type: string;
  /** The name of the field. */
  field: string;
  /** The display name of the field, optional. */
  displayName?: string | null;
  /** Tags associated with the field, optional. */
  tags?: string[] | null;
  /** Indicates if the field is a system field, optional. */
  system?: boolean | null;
  /** Indicates if the field is a collection, optional. */
  collection?: boolean | null;
  /** Specifies the types for which the field is applicable, optional. */
  onlyForTypes?: string[] | null;
  /** Indicates if the field is required, optional. */
  required?: boolean | null;
  /** Indicates if the field is not nullable, optional. */
  notNullable?: boolean | null;
  /** The default value of the field, optional. */
  defaultValue?: any;
  /** Indicates if the field is a type field, optional. */
  isTypeField?: boolean | null;
  /** Indicates if the field is searchable, optional. */
  searchable?: boolean | null;
  /** Options for the field, optional. */
  options?: FieldOption[] | null;
  /** Validators for the field, optional. */
  validators?: SchemaValidator[] | null;
}

/**
 * Represents a map of schema fields.
 * The key is a string representing the schema name.
 * The value is an array of SchemaField objects.
 */
export type SchemaMap = Record<string, SchemaField[]>;

/**
 * Enum representing the various field types.
 */
export enum FieldType {
  String = "String",
  Bool = "Bool",
  Int = "Int",
  Date = "Date",
  DateTime = "DateTime",
  Time = "Time",
  Double = "Double",
  EntityRef = "EntityRef",
  Compound = "Compound",
  AutoId = "AutoId",
  Image = "Image",
  Any = "Any",
}

/**
 * Represents a field that references an entity.
 */
export interface EntityRefField extends SchemaField {
  /** The type of the field, which is EntityRef. */
  type: FieldType.EntityRef;
  /** The type of the referenced entity. */
  entityRefType: string;
  /** The parent field of the entity reference. */
  parentField: string;
}

/**
 * Represents an option for a field.
 */
export interface FieldOption {
  /** The name of the option. */
  name: string;
  /** The value of the option. */
  value: any;
  /** The description of the option, optional. */
  description?: string | null;
  /** The group of the option, optional. */
  group?: string | null;
  /** Indicates if the option is disabled, optional. */
  disabled?: boolean | null;
}

/**
 * Represents a compound field that contains child fields.
 */
export interface CompoundField extends SchemaField {
  /** The type of the field, which is Compound. */
  type: FieldType.Compound;
  /** The child fields of the compound field. */
  children: SchemaField[];
  /** Indicates if the children are tree-structured, optional. */
  treeChildren?: boolean;
  /** The schema reference for the compound field, optional. */
  schemaRef?: string;
}

/**
 * Enum representing the various validation message types.
 */
export enum ValidationMessageType {
  NotEmpty = "NotEmpty",
  MinLength = "MinLength",
  MaxLength = "MaxLength",
  NotAfterDate = "NotAfterDate",
  NotBeforeDate = "NotBeforeDate",
}

/**
 * Interface for schema-related operations.
 */
export interface SchemaInterface {
  /**
   * Checks if the value of a field is empty.
   * @param field The schema field.
   * @param value The value to check.
   * @returns True if the value is empty, false otherwise.
   */
  isEmptyValue(field: SchemaField, value: any): boolean;

  /**
   * Gets the text representation of a field's value.
   * @param field The schema field.
   * @param value The value to convert.
   * @param element Indicates if the value is an element, optional.
   * @returns The text representation of the value.
   */
  textValue(
    field: SchemaField,
    value: any,
    element?: boolean,
  ): string | undefined;

  /**
   * Gets the length of a control's value.
   * @param field The schema field.
   * @param control The control to check.
   * @returns The length of the control's value.
   */
  controlLength(field: SchemaField, control: Control<any>): number;

  /**
   * Gets the length of a field's value.
   * @param field The schema field.
   * @param value The value to check.
   * @returns The length of the value.
   */
  valueLength(field: SchemaField, value: any): number;

  /**
   * Gets the data options for a schema data node.
   * @param node The schema data node.
   * @returns The data options.
   */
  getDataOptions(node: SchemaDataNode): FieldOption[] | null | undefined;

  /**
   * Gets the node options for a schema node.
   * @param node The schema node.
   * @returns The node options.
   */
  getNodeOptions(node: SchemaNode): FieldOption[] | null | undefined;

  /**
   * Gets the options for a schema field.
   * @param field The schema field.
   * @returns The field options.
   */
  getOptions(field: SchemaField): FieldOption[] | undefined | null;

  /**
   * Gets the filter options for a schema data node and field.
   * @param array The schema data node.
   * @param field The schema node.
   * @returns The filter options.
   */
  getFilterOptions(
    array: SchemaDataNode,
    field: SchemaNode,
  ): FieldOption[] | undefined | null;

  /**
   * Parses a string value to milliseconds.
   * @param field The schema field.
   * @param v The string value to parse.
   * @returns The parsed value in milliseconds.
   */
  parseToMillis(field: SchemaField, v: string): number;

  /**
   * Gets the validation message text for a field.
   * @param field The schema field.
   * @param messageType The type of validation message.
   * @param actual The actual value.
   * @param expected The expected value.
   * @returns The validation message text.
   */
  validationMessageText(
    field: SchemaField,
    messageType: ValidationMessageType,
    actual: any,
    expected: any,
  ): string;

  /**
   * Compares two values of a field.
   * @param field The schema field.
   * @param v1 The first value.
   * @param v2 The second value.
   * @returns The comparison result.
   */
  compareValue(field: SchemaField, v1: unknown, v2: unknown): number;

  /**
   * Gets the search text for a field's value.
   * @param field The schema field.
   * @param value The value to search.
   * @returns The search text.
   */
  searchText(field: SchemaField, value: any): string;

  makeEqualityFunc(field: SchemaNode, element?: boolean): EqualityFunc;

  makeControlSetup(field: SchemaNode, element?: boolean): ControlSetup<any>;
}

export interface SchemaTreeLookup {
  getSchema(schemaId: string): SchemaNode | undefined;
}

export interface SchemaNode extends SchemaTreeLookup {
  id: string;
  field: SchemaField;
  getChildNodes(withParent?: SchemaNode): SchemaNode[];
  parent?: SchemaNode;
}

export interface SchemaDataNode {
  id: string;
  schema: SchemaNode;
  elementIndex?: number;
  control: Control<any>;
  parent?: SchemaDataNode;
  getChild(schemaNode: SchemaNode): SchemaDataNode;
  getChildElement(index: number): SchemaDataNode;
}

export function findField(
  fields: SchemaField[],
  field: string,
): SchemaField | undefined {
  return fields.find((x) => x.field === field);
}

export function isScalarField(sf: SchemaField): sf is SchemaField {
  return !isCompoundField(sf);
}

export function isCompoundField(sf: SchemaField): sf is CompoundField {
  return sf.type === FieldType.Compound;
}

function missingField(field: string): SchemaField {
  return { field: "__missing", type: FieldType.Any, displayName: field };
}

export function resolveSchemaParent(node: SchemaNode): SchemaNode | undefined {
  const field = node.field;
  if (!isCompoundField(field)) return undefined;
  return field.schemaRef
    ? node.getSchema(field.schemaRef)
    : field.treeChildren
      ? node.parent
        ? resolveSchemaParent(node.parent)
        : undefined
      : node;
}

export function resolveSchemaNode(
  node: SchemaNode,
  fieldSegment: string,
): SchemaNode | undefined {
  if (fieldSegment == ".") return node;
  if (fieldSegment == "..") return node.parent;
  const parentNode = resolveSchemaParent(node);
  return parentNode
    ?.getChildNodes(node)
    .find((x) => x.field.field == fieldSegment);
}

function nodeForSchema(
  field: SchemaField,
  lookup: SchemaTreeLookup,
  parent: SchemaNode | undefined,
): SchemaNode {
  const node = {
    id: parent ? parent.id + "/" + field.field : field.field,
    field,
    getSchema: lookup.getSchema,
    parent,
    getChildNodes,
  };
  return node;

  function getChildNodes(withParent?: SchemaNode): SchemaNode[] {
    return isCompoundField(field)
      ? field.children.map((x) => nodeForSchema(x, lookup, withParent ?? node))
      : [];
  }
}

export function createSchemaLookup<A extends Record<string, SchemaField[]>>(
  schemaMap: A,
): {
  getSchema(schemaId: keyof A): SchemaNode;
} {
  const lookup = {
    getSchema,
  };
  return lookup;

  function getSchema(schemaId: keyof A): SchemaNode {
    const fields = schemaMap[schemaId];
    if (fields) {
      return rootSchemaNode(fields, lookup);
    }
    return undefined!;
  }
}

export function makeSchemaDataNode(
  schema: SchemaNode,
  control: Control<unknown>,
  parent?: SchemaDataNode,
  elementIndex?: number,
): SchemaDataNode {
  const indexId = typeof elementIndex === "number" ? "/" + elementIndex : "";
  const dataNode = {
    id:
      (parent ? parent.id + "/" + schema.field.field : schema.field.field) +
      indexId,
    schema,
    control,
    parent,
    elementIndex,
    getChild,
    getChildElement,
  };
  return dataNode;

  function getChild(childNode: SchemaNode): SchemaDataNode {
    const objControl = control as Control<Record<string, unknown>>;
    if (objControl && objControl.current.isNull) {
      objControl.value = {};
    }
    return makeSchemaDataNode(
      childNode,
      objControl?.fields[childNode.field.field],
      dataNode,
    );
  }

  function getChildElement(elementIndex: number): SchemaDataNode {
    return makeSchemaDataNode(
      schema,
      (control as Control<unknown[]>)?.elements?.[elementIndex],
      dataNode,
      elementIndex,
    );
  }
}

export function schemaDataForFieldRef(
  fieldRef: string | undefined,
  schema: SchemaDataNode,
): SchemaDataNode {
  return schemaDataForFieldPath(fieldRef?.split("/") ?? [], schema);
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
      childNode = nodeForSchema(missingField(nextField), schema, schema);
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

export function schemaDataForFieldPath(
  fieldPath: string[],
  dataNode: SchemaDataNode,
): SchemaDataNode {
  let i = 0;
  while (i < fieldPath.length) {
    const nextField = fieldPath[i];
    let nextNode =
      nextField === ".." ? dataNode.parent : lookupField(nextField);
    nextNode ??= makeSchemaDataNode(
      nodeForSchema(missingField(nextField), dataNode.schema, dataNode.schema),
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

export function schemaForFieldPath(
  fieldPath: string[],
  schema: SchemaNode,
): SchemaNode {
  let i = 0;
  while (i < fieldPath.length) {
    const nextField = fieldPath[i];
    let childNode = resolveSchemaNode(schema, nextField);
    if (!childNode) {
      childNode = nodeForSchema(missingField(nextField), schema, schema);
    }
    schema = childNode;
    i++;
  }
  return schema;
}

export const emptySchemaLookup: SchemaTreeLookup = {
  getSchema(schemaId: string): SchemaNode | undefined {
    return undefined;
  },
};
export function rootSchemaNode(
  fields: SchemaField[],
  lookup: SchemaTreeLookup,
): SchemaNode {
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

export function getSchemaNodePath(node: SchemaNode) {
  const paths: string[] = [];
  let curNode: SchemaNode | undefined = node;
  while (curNode) {
    paths.push(curNode.field.field);
    curNode = curNode.parent;
  }
  return paths.reverse();
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
  if (parent.id === child.id) return "";

  const parentPath = getSchemaNodePath(parent);
  const childPath = getSchemaNodePath(child);

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

export enum SchemaTags {
  NoControl = "_NoControl",
  HtmlEditor = "_HtmlEditor",
  ControlGroup = "_ControlGroup:",
  ControlRef = "_ControlRef:",
  IdField = "_IdField:",
}

export function getTagParam(
  field: SchemaField,
  tag: string,
): string | undefined {
  return field.tags?.find((x) => x.startsWith(tag))?.substring(tag.length);
}

export function makeParamTag(tag: string, value: string): string {
  return `${tag}${value}`;
}
