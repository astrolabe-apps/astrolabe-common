import {
  CompoundField,
  FieldType,
  isCompoundField,
  SchemaField,
  SchemaTags,
} from "./schemaField";

/**
 * Minimal schema describing scriptable fields on ControlDefinition.
 * Used by the generic scripts loop to derive coercion functions from field types
 * and to resolve dot-path keys to the correct override target.
 */
export const ControlDefinitionScriptFields: SchemaField[] = [
  {
    field: "hidden",
    type: FieldType.Bool,
    displayName: "Hidden",
    tags: [SchemaTags.ScriptNullInit],
  },
  { field: "readonly", type: FieldType.Bool, displayName: "Readonly" },
  { field: "disabled", type: FieldType.Bool, displayName: "Disabled" },
  { field: "title", type: FieldType.String, displayName: "Title" },
  { field: "defaultValue", type: FieldType.Any, displayName: "Default Value" },
  { field: "actionData", type: FieldType.Any, displayName: "Action Data" },
  { field: "style", type: FieldType.Compound, displayName: "Style" },
  { field: "layoutStyle", type: FieldType.Compound, displayName: "Layout Style" },
  { field: "allowedOptions", type: FieldType.Any, displayName: "Allowed Options" },
  {
    field: "displayData",
    type: FieldType.Compound,
    displayName: "Display Data",
    children: [
      { field: "text", type: FieldType.String, displayName: "Text" },
      { field: "html", type: FieldType.String, displayName: "Html" },
      { field: "iconClass", type: FieldType.String, displayName: "Icon Class" },
    ],
  } as CompoundField,
  {
    field: "groupOptions",
    type: FieldType.Compound,
    displayName: "Group Options",
    children: [
      { field: "columns", type: FieldType.Int, displayName: "Columns" },
    ],
  } as CompoundField,
  {
    field: "renderOptions",
    type: FieldType.Compound,
    displayName: "Render Options",
    children: [
      {
        field: "groupOptions",
        type: FieldType.Compound,
        displayName: "Group Options",
        children: [
          { field: "columns", type: FieldType.Int, displayName: "Columns" },
        ],
      } as CompoundField,
    ],
  } as CompoundField,
];

export interface ResolvedSchemaPath {
  segments: string[];
  leafField: SchemaField;
}

/**
 * Resolves a dot-separated key (e.g. "groupOptions.columns") against a schema,
 * walking CompoundField children at each step.
 * Returns the path segments and the leaf SchemaField for coercion lookup.
 */
export function resolveSchemaPath(
  key: string,
  schema: SchemaField[],
): ResolvedSchemaPath | undefined {
  const segments = key.split(".");
  let currentFields = schema;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const field = currentFields.find((f) => f.field === seg);
    if (!field) return undefined;
    if (i === segments.length - 1) {
      return { segments, leafField: field };
    }
    if (!isCompoundField(field)) return undefined;
    currentFields = field.children;
  }
  return undefined;
}

/**
 * Returns the appropriate coercion function for a SchemaField type.
 */
export function coerceForFieldType(fieldType: string): (v: unknown) => any {
  switch (fieldType) {
    case FieldType.Bool:
      return (r) => !!r;
    case FieldType.Int:
    case FieldType.Double:
      return (r) => (typeof r === "number" ? r : undefined);
    case FieldType.String:
      return coerceStringValue;
    case FieldType.Compound:
      return (v) => (typeof v === "object" ? v : undefined);
    default:
      return (r) => r;
  }
}

function coerceStringValue(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  switch (typeof v) {
    case "number":
    case "boolean":
      return v.toString();
    default:
      return JSON.stringify(v);
  }
}

/**
 * Checks if a SchemaField has a given tag.
 */
export function hasSchemaTag(field: SchemaField, tag: string): boolean {
  return field.tags?.includes(tag) ?? false;
}
