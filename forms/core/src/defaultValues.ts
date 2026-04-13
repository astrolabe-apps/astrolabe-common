import { isCompoundField, SchemaField } from "./schemaField";

/**
 * Applies default values to the given record based on the provided schema fields.
 * @param v - The record to apply default values to.
 * @param fields - The schema fields to use for applying default values.
 * @param doneSet - A set to keep track of processed records.
 * @returns The record with default values applied.
 */
export function applyDefaultValues(
  v: Record<string, any> | undefined,
  fields: SchemaField[],
  doneSet?: Set<Record<string, any>>,
): any {
  if (!v) return defaultValueForFields(fields);
  if (doneSet && doneSet.has(v)) return v;
  doneSet ??= new Set();
  doneSet.add(v);
  const applyValue = fields.filter(
    (x) => isCompoundField(x) || !(x.field in v),
  );
  if (!applyValue.length) return v;
  const out = { ...v };
  applyValue.forEach((x) => {
    out[x.field] =
      x.field in v
        ? applyDefaultForField(v[x.field], x, fields, false, doneSet)
        : defaultValueForField(x);
  });
  return out;
}

/**
 * Applies default values to a specific field based on the provided schema field.
 * @param v - The value to apply default values to.
 * @param field - The schema field to use for applying default values.
 * @param parent - The parent schema fields.
 * @param notElement - Flag indicating if the field is not an element.
 * @param doneSet - A set to keep track of processed records.
 * @returns The value with default values applied.
 */
export function applyDefaultForField(
  v: any,
  field: SchemaField,
  parent: SchemaField[],
  notElement?: boolean,
  doneSet?: Set<Record<string, any>>,
): any {
  if (field.collection && !notElement) {
    return ((v as any[]) ?? []).map((x) =>
      applyDefaultForField(x, field, parent, true, doneSet),
    );
  }
  if (isCompoundField(field)) {
    if (!v && !field.required) return v;
    return applyDefaultValues(
      v,
      field.treeChildren ? parent : field.children,
      doneSet,
    );
  }
  return defaultValueForField(field);
}

/**
 * Returns the default values for the provided schema fields.
 * @param fields - The schema fields to get default values for.
 * @returns The default values for the schema fields.
 */
export function defaultValueForFields(fields: SchemaField[]): any {
  return Object.fromEntries(
    fields.map((x) => [x.field, defaultValueForField(x)]),
  );
}

/**
 * Returns the default value for a specific schema field.
 * @param sf - The schema field to get the default value for.
 * @param required - Flag indicating if the field is required.
 * @returns The default value for the schema field.
 */
export function defaultValueForField(
  sf: SchemaField,
  required?: boolean | null,
): any {
  if (sf.defaultValue !== undefined) return sf.defaultValue;
  const isRequired = !!(required || sf.required);
  if (isCompoundField(sf)) {
    if (isRequired) {
      const childValue = defaultValueForFields(sf.children ?? []);
      return sf.collection ? [childValue] : childValue;
    }
    return sf.notNullable ? (sf.collection ? [] : {}) : undefined;
  }
  if (sf.collection && sf.notNullable) {
    return [];
  }
  return undefined;
}

/**
 * Returns the element value for a specific schema field.
 * @param sf - The schema field to get the element value for.
 * @returns The element value for the schema field.
 */
export function elementValueForField(sf: SchemaField): any {
  if (isCompoundField(sf)) {
    return defaultValueForFields(sf.children ?? []);
  }
  return sf.defaultValue;
}
