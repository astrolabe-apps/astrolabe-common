import fc, { Arbitrary } from "fast-check";
import {
  createSchemaLookup,
  defaultControlForField,
  FieldType,
  FormNode,
  isCompoundField,
  legacyFormNode,
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
export interface FieldAndValueChanged extends FieldAndValue {
  newValue: any;
}

export interface FieldAndValueChanges extends FieldAndValue {
  newValues: any[];
}

export function newIndexes(arr: number): Arbitrary<number[]> {
  return fc.array(fc.integer(), { minLength: arr, maxLength: arr }).map((x) =>
    x
      .map((n, i) => ({ n, i }))
      .sort((a, b) => a.n - b.n)
      .map((x) => x.i),
  );
}

export function valueAndSchema(
  schemaOptions?: SchemaFieldGenOptions,
): Arbitrary<FieldAndValue> {
  return randomSchemaField(schemaOptions).chain((schema) =>
    randomValueForField(schema).map((value) => ({
      field: schema,
      value,
    })),
  );
}
export function valueSchemaAndChange(
  schemaOptions?: SchemaFieldGenOptions,
): Arbitrary<FieldAndValueChanged> {
  return valueAndSchema(schemaOptions).chain(changedValue);
}

export function valuesAndSchema(
  schemaOptions?: SchemaFieldGenOptions,
): Arbitrary<FieldAndValueChanges> {
  return randomSchemaField(schemaOptions)
    .chain((schema) =>
      randomValueForField(schema).map((value) => ({
        field: schema,
        value,
      })),
    )
    .chain((fv) =>
      fc
        .array(fc.constant(undefined as any), {
          minLength: 1,
          maxLength: 5,
        })
        .chain(
          (vals) =>
            vals.reduce(
              (acc: Arbitrary<any[]>) =>
                acc.chain((x) =>
                  changeValue(x[x.length - 1], fv.field, true).map((y) => [
                    ...x,
                    y,
                  ]),
                ),
              changeValue(fv.value, fv.field, true).map((x) => [x]),
            ) as Arbitrary<any[]>,
        )
        .map((newValues) => ({ ...fv, newValues })),
    );
}

export function changedValue(
  val: FieldAndValue,
): Arbitrary<FieldAndValueChanged> {
  return changeValue(val.value, val.field, true).map((newValue) => ({
    ...val,
    newValue,
  }));
}

export function makeDataNode(fv: FieldAndValue): SchemaDataNode {
  return makeSchemaDataNode(
    createSchemaLookup({ "": [fv.field] })
      .getSchema("")!
      .getChildNode(fv.field.field)!,
    newControl(fv.value),
  );
}

export function makeDataAndDefinition(
  fv: FieldAndValue,
): [SchemaDataNode, FormNode] {
  const d = makeDataNode(fv);
  return [d, legacyFormNode(defaultControlForField(fv.field))];
}

export interface SchemaFieldGenOptions {
  arrayChance?: number;
  forceCompound?: boolean;
  forceArray?: boolean;
  compoundChance?: number;
  idField?: boolean;
  maxDepth?: number;
  notNullable?: boolean;
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
    maxDepth = 3,
  } = options;
  const nextOptions = { arrayChance, compoundChance, maxDepth: maxDepth - 1 };
  const realCompoundChance = maxDepth > 0 ? compoundChance : 0;
  const field = fc.oneof(
    {
      weight: forceCompound ? 100 : realCompoundChance,
      arbitrary: fc.constant(FieldType.Compound),
    },
    {
      weight: forceCompound ? 0 : 100 - realCompoundChance,
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
      field: fc.string().filter((x) => !x.includes("/")),
      type: fc.constant(fieldType),
      collection,
      notNullable:
        options.notNullable != null
          ? fc.constant(options.notNullable)
          : fc.boolean(),
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
export function randomValueForField(
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
      if (f.type === FieldType.Double) return fc.double({ noNaN: true });
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
    return fc.constantFrom(null);
  }) as (x: number) => Arbitrary<any>);
}

export function changeValue(
  value: any,
  field: SchemaField,
  forceChange: boolean | undefined,
  element?: boolean,
): Arbitrary<any> {
  return fc.boolean().chain((shouldChange) => {
    if (forceChange === false || (!shouldChange && !forceChange))
      return fc.constant(value);
    if (field.collection && !element) {
      if (!value || !value.length)
        return changeValue(undefined, field, true, true).map((x) => [x]);
      return (value as any[]).reduce(
        (acc, x) =>
          acc.chain((nx: any[]) =>
            changeValue(x, field, undefined, true).map((v) => [...nx, v]),
          ),
        fc.constant([] as any[]),
      );
    }
    if (isCompoundField(field)) {
      return fc.record(
        Object.fromEntries(
          field.children.map((x) => [
            x.field,
            changeValue(value?.[x.field], x, value == null ? true : undefined),
          ]),
        ),
      );
    }
    return fc.constant(changePrim() as any);
    function changePrim() {
      switch (field.type) {
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
  });
}
