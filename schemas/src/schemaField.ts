import { SchemaValidator } from "./schemaValidator";

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

export function missingField(field: string): SchemaField {
  return { field: "__missing", type: FieldType.Any, displayName: field };
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
