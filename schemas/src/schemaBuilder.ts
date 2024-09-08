import {
  CompoundField,
  FieldOption,
  FieldType,
  SchemaField,
  SchemaMap,
} from "./types";
import { isCompoundField } from "./util";

export type AllowedSchema<T> = T extends string
  ? SchemaField & {
      type:
        | FieldType.String
        | FieldType.Date
        | FieldType.DateTime
        | FieldType.Time;
    }
  : T extends number
    ? SchemaField & {
        type: FieldType.Int | FieldType.Double;
      }
    : T extends boolean
      ? SchemaField & {
          type: FieldType.Bool;
        }
      : T extends Array<infer E>
        ? AllowedSchema<E> & {
            collection: true;
          }
        : T extends { [key: string]: any }
          ? CompoundField & {
              type: FieldType.Compound;
            }
          : SchemaField & { type: FieldType.Any };

type AllowedField<T, K> = (
  name: string,
) => (SchemaField & { type: K }) | AllowedSchema<T>;

export function buildSchema<T, Custom = "">(def: {
  [K in keyof T]-?: AllowedField<T[K], Custom>;
}): SchemaField[] {
  return Object.entries(def).map((x) =>
    (x[1] as (n: string) => SchemaField)(x[0]),
  );
}

export type FieldBuilder<T extends FieldType, K> = (
  name: string,
) => Omit<SchemaField, "type"> & { type: T } & K;

export function stringField(
  displayName: string,
): FieldBuilder<FieldType.String, {}>;

export function stringField<S extends Partial<SchemaField>>(
  displayName: string,
  options: S,
): FieldBuilder<FieldType.String, S>;

export function stringField(displayName: string, options?: any) {
  return makeScalarField({
    type: FieldType.String,
    displayName,
    ...options,
  });
}

export function stringOptionsField(
  displayName: string,
  ...options: FieldOption[]
) {
  return makeScalarField({
    type: FieldType.String as const,
    displayName,
    options,
  });
}

export function withScalarOptions<
  S extends SchemaField,
  S2 extends Partial<SchemaField>,
>(options: S2, v: (name: string) => S): (name: string) => S & S2 {
  return (n) => ({ ...v(n), ...options });
}

export function makeScalarField<S extends Partial<SchemaField>>(
  options: S,
): (name: string) => SchemaField & S {
  return (n) => ({ ...defaultScalarField(n, n), ...options });
}

export function makeCompoundField<S extends Partial<CompoundField>>(
  options: S,
): (name: string) => CompoundField & {
  type: FieldType.Compound;
} & S {
  return (n) => ({ ...defaultCompoundField(n, n, false), ...options });
}

export function intField(displayName: string): FieldBuilder<FieldType.Int, {}>;

export function intField<S extends Partial<SchemaField>>(
  displayName: string,
  options: S,
): FieldBuilder<FieldType.Int, S>;

export function intField<S extends Partial<SchemaField>>(
  displayName: string,
  options?: S,
) {
  return makeScalarField({
    type: FieldType.Int as const,
    displayName,
    ...(options as S),
  });
}

export function doubleField(
  displayName: string,
): FieldBuilder<FieldType.Double, {}>;

export function doubleField<S extends Partial<SchemaField>>(
  displayName: string,
  options: S,
): FieldBuilder<FieldType.Double, S>;

export function doubleField<S extends Partial<SchemaField>>(
  displayName: string,
  options?: S,
) {
  return makeScalarField({
    type: FieldType.Double as const,
    displayName,
    ...(options as S),
  });
}

export function dateField(
  displayName: string,
): FieldBuilder<FieldType.Date, {}>;

export function dateField<S extends Partial<SchemaField>>(
  displayName: string,
  options: S,
): FieldBuilder<FieldType.Date, S>;

export function dateField<S extends Partial<SchemaField>>(
  displayName: string,
  options?: S,
) {
  return makeScalarField({
    type: FieldType.Date as const,
    displayName,
    ...(options as S),
  });
}

export function timeField<S extends Partial<SchemaField>>(
  displayName: string,
  options?: S,
) {
  return makeScalarField({
    type: FieldType.Time as const,
    displayName,
    ...(options as S),
  });
}

export function dateTimeField<S extends Partial<SchemaField>>(
  displayName: string,
  options?: S,
) {
  return makeScalarField({
    type: FieldType.DateTime as const,
    displayName,
    ...(options as S),
  });
}

export function boolField(
  displayName: string,
): FieldBuilder<FieldType.Bool, {}>;

export function boolField<S extends Partial<SchemaField>>(
  displayName: string,
  options: S,
): FieldBuilder<FieldType.Bool, S>;

export function boolField(displayName: string, options?: any) {
  return makeScalarField({
    type: FieldType.Bool as const,
    displayName,
    ...options,
  });
}

export function compoundField<
  Other extends Partial<Omit<CompoundField, "type" | "schemaType">>,
>(
  displayName: string,
  fields: SchemaField[],
  other?: Other,
): (name: string) => CompoundField & {
  collection: Other["collection"];
} {
  return (field) =>
    ({
      ...defaultCompoundField(field, displayName, false),
      ...other,
      children: fields,
    }) as any;
}

export function defaultScalarField(
  field: string,
  displayName: string,
): Omit<SchemaField, "type"> & {
  type: FieldType.String;
} {
  return {
    field,
    displayName,
    type: FieldType.String,
  };
}

export function defaultCompoundField(
  field: string,
  displayName: string,
  collection: boolean,
): CompoundField & {
  type: FieldType.Compound;
} {
  return {
    field,
    displayName,
    type: FieldType.Compound,
    collection,
    children: [],
  };
}

export function mergeField(
  field: SchemaField,
  mergeInto: SchemaField[],
): SchemaField[] {
  const existing = mergeInto.find((x) => x.field === field.field);
  if (existing) {
    return mergeInto.map((x) =>
      x !== existing
        ? x
        : {
            ...x,
            onlyForTypes: mergeTypes(x.onlyForTypes, field.onlyForTypes),
          },
    );
  }
  return [...mergeInto, field];

  function mergeTypes(f?: string[] | null, s?: string[] | null) {
    if (!f) return s;
    if (!s) return f;
    const extras = s.filter((x) => !f.includes(x));
    return extras.length ? [...f, ...extras] : f;
  }
}

export function mergeFields(
  fields: SchemaField[],
  name: string,
  value: any,
  newFields: SchemaField[],
): SchemaField[] {
  const withType = fields.map((x) =>
    x.isTypeField ? addFieldOption(x, name, value) : x,
  );
  return newFields
    .map((x) => ({ ...x, onlyForTypes: [value] }))
    .reduce((af, x) => mergeField(x, af), withType);
}

export function addFieldOption(
  typeField: SchemaField,
  name: string,
  value: any,
): SchemaField {
  const options = typeField.options ?? [];
  if (options.some((x) => x.value === value)) return typeField;
  return {
    ...typeField,
    options: [...options, { name, value }],
  };
}

export function resolveSchemas<A extends SchemaMap>(schemaMap: A): A {
  const out: SchemaMap = {};
  function resolveSchemaType(type: string) {
    if (type in out) {
      return out[type];
    }
    const resolvedFields: SchemaField[] = [];
    out[type] = resolvedFields;
    schemaMap[type].forEach((x) => {
      if (isCompoundField(x) && x.schemaRef) {
        resolvedFields.push({
          ...x,
          children: resolveSchemaType(x.schemaRef),
        } as CompoundField);
      } else {
        resolvedFields.push(x);
      }
    });
    return resolvedFields;
  }
  Object.keys(schemaMap).forEach(resolveSchemaType);
  return out as A;
}
