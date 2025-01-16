import fc, { Arbitrary } from "fast-check";
import {
  CompoundField,
  createSchemaLookup,
  FieldType,
  isCompoundField,
  makeSchemaDataNode,
  SchemaDataNode,
  SchemaField,
  SchemaTags,
} from "../src";
import { newControl } from "@react-typed-forms/core";

export interface FieldAndValue {
  field: SchemaField;
  value: any;
}

export function valueAndSchema(
  options?: SchemaFieldGenOptions,
): Arbitrary<FieldAndValue> {
  return randomSchemaField(options).chain((schema) =>
    randomValueForField(schema).map((value) => ({ field: schema, value })),
  );
}

export function makeDataNode(fv: FieldAndValue): SchemaDataNode {
  return makeSchemaDataNode(
    createSchemaLookup({ "": [fv.field] })
      .getSchema("")!
      .getChildNode(fv.field.field)!,
    newControl(fv.value),
  );
}

export interface SchemaFieldGenOptions {
  arrayChance?: number;
  forceCompound?: boolean;
  forceArray?: boolean;
  compoundChance?: number;
  idField?: boolean;
}
function randomSchemaField(
  options: SchemaFieldGenOptions = {},
): Arbitrary<SchemaField> {
  const {
    arrayChance = 5,
    compoundChance = 10,
    forceCompound,
    forceArray,
    idField,
  } = options;
  const nextOptions = { arrayChance, compoundChance };
  const field = fc.oneof(
    {
      weight: forceCompound ? 100 : compoundChance,
      arbitrary: fc.constant(FieldType.Compound),
    },
    {
      weight: forceCompound ? 0 : 100 - compoundChance,
      arbitrary: fc.constantFrom(
        FieldType.String,
        FieldType.Int,
        FieldType.Double,
        FieldType.Bool,
        FieldType.Date,
        FieldType.DateTime,
        FieldType.Time,
      ),
    },
  );
  const collection = fc.oneof(
    {
      weight: forceArray ? 0 : 100 - arrayChance,
      arbitrary: fc.constant(false),
    },
    {
      weight: forceArray ? 100 : arrayChance,
      arbitrary: fc.constant(true),
    },
  );

  const withoutId = field.chain((fieldType) =>
    fc.record({
      field: fc.string(),
      type: fc.constant(fieldType),
      collection,
      notNullable: fc.boolean(),
      children:
        fieldType == FieldType.Compound
          ? fc
              .array(randomSchemaField(nextOptions), {
                minLength: 1,
                maxLength: 10,
              })
              .map((x) =>
                Object.values(Object.fromEntries(x.map((y) => [y.field, y]))),
              )
          : fc.constant(null),
    }),
  );
  return !idField
    ? withoutId
    : withoutId.chain((x) =>
        fc.integer({ min: 0, max: (x.children?.length ?? 0) - 1 }).map((i) => ({
          ...x,
          tags: [SchemaTags.IdField + x.children![i].field],
        })),
      );
}
function randomValueForField(
  f: SchemaField,
  element?: boolean,
): Arbitrary<any> {
  return fc.integer({ min: 0, max: 100 }).chain(((nc) => {
    if (nc <= 75 || f.notNullable) {
      if (!element && f.collection) {
        return fc.array(randomValueForField(f, true), {
          minLength: 0,
          maxLength: 10,
        });
      }
      if (f.type === FieldType.String) return fc.string();
      if (f.type === FieldType.Int) return fc.integer();
      if (f.type === FieldType.Double) return fc.double();
      if (f.type === FieldType.Bool) return fc.boolean();
      if (f.type === FieldType.Date)
        return fc.date().map((x) => x.toISOString().substring(0, 10));
      if (f.type === FieldType.DateTime)
        return fc.date().map((x) => x.toISOString());
      if (f.type === FieldType.Time)
        return fc.date().map((x) => x.toISOString().substring(11));
      if (isCompoundField(f))
        return fc.record(
          Object.fromEntries(
            f.children.map((x) => [x.field, randomValueForField(x)]),
          ),
        );
    }
    return fc.constantFrom(null, undefined);
  }) as (x: number) => Arbitrary<any>);
}

export function changeValue(
  value: any,
  field: SchemaField,
  element?: boolean,
): any {
  if (field.collection && !element) {
    return [...(value ?? []), changeValue(undefined, field, true)];
  }
  switch (field.type) {
    case FieldType.Compound:
      const objValue = value ?? {};
      return Object.fromEntries(
        (field as CompoundField).children.map((x) => [
          x.field,
          changeValue(objValue[x.field], x),
        ]),
      );
    case FieldType.String:
    case FieldType.Date:
    case FieldType.DateTime:
    case FieldType.Time:
      return (value ?? "") + "x";
    case FieldType.Int:
      const v = value ?? 0;
      return !v ? 1 : -v;
    case FieldType.Double:
      const dv = value ?? 0;
      return !dv ? 1 : -dv;
    case FieldType.Bool:
      return !(value ?? false);
  }
}
