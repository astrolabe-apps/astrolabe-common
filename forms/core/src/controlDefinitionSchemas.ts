import { FieldType, SchemaField } from "./schemaField";

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
