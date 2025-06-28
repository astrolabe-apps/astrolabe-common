import fc, { Arbitrary, ArrayConstraints, StringConstraints } from "fast-check";
import {
  compoundField,
  CompoundField,
  FieldType,
  isCompoundField,
  SchemaField,
  SchemaTags,
} from "../src";

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
  return randomSchemaField("", schemaOptions).chain((schema) =>
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
  return randomSchemaField("", schemaOptions)
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

export interface SchemaFieldGenOptions {
  arrayChance?: number;
  forceCompound?: boolean;
  forceArray?: boolean;
  compoundChance?: number;
  idField?: boolean;
  maxDepth?: number;
  notNullable?: boolean;
  fieldType?: Arbitrary<FieldType>;
}

export function arbitraryFieldName(
  fieldConstraints?: StringConstraints,
): Arbitrary<string> {
  return fc
    .string({ minLength: 1, ...fieldConstraints })
    .filter((x) => x != "." && x != ".." && !x.includes("/"));
}

export function rootCompound(
  options: SchemaFieldGenOptions = {},
  fieldConstraints?: StringConstraints,
): Arbitrary<{ root: CompoundField; schema: SchemaField }> {
  return arbitraryFieldName(fieldConstraints).chain((x) =>
    randomSchemaField(x, options).map((c) => ({
      root: compoundField("ROOT", [c], { notNullable: true })(""),
      schema: c,
    })),
  );
}

export function randomSchemaField(
  field: string,
  options: SchemaFieldGenOptions = {},
): Arbitrary<SchemaField> {
  const {
    arrayChance = 5,
    compoundChance = 10,
    forceCompound,
    forceArray,
    idField,
    maxDepth = 3,
    fieldType,
  } = options;
  const nextOptions = { arrayChance, compoundChance, maxDepth: maxDepth - 1 };
  const realCompoundChance = maxDepth > 0 ? compoundChance : 0;
  const arbFieldType =
    fieldType ??
    fc.oneof(
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

  const withoutId = arbFieldType.chain((ft) =>
    fc.record({
      field: fc.constant(field),
      type: fc.constant(ft),
      collection,
      notNullable:
        options.notNullable != null
          ? fc.constant(options.notNullable)
          : fc.boolean(),
      children:
        ft == FieldType.Compound
          ? fc
              .dictionary(
                arbitraryFieldName(),
                randomSchemaField("", nextOptions),
                { minKeys: 1, maxKeys: 10 },
              )
              .map((x) =>
                Object.entries(x).map(([k, v]) => ({ ...v, field: k })),
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

export interface FieldValueConstraints {
  nullableChance?: number;
  element?: boolean;
  string?: StringConstraints;
  array?: ArrayConstraints;
  childConstraints?: () => FieldValueConstraints;
}
export function randomValueForField(
  f: SchemaField,
  constraints?: FieldValueConstraints,
  element?: boolean,
): Arbitrary<any> {
  const chance = constraints?.nullableChance ?? (f.notNullable ? 0 : 25);
  const childConstraints = constraints?.childConstraints?.() ?? constraints;
  return fc.noBias(fc.integer({ min: 0, max: 100 })).chain(((nc) => {
    if (nc >= chance) {
      if (!element && f.collection) {
        const arrayConstraints = constraints?.array ?? {
          minLength: 0,
          maxLength: 10,
        };
        return fc.array(
          randomValueForField(f, childConstraints, true),
          arrayConstraints,
        );
      }
      if (f.type === FieldType.String) return fc.string(constraints?.string);
      if (f.type === FieldType.Int) return fc.integer();
      if (f.type === FieldType.Double) return fc.double({ noNaN: true });
      if (f.type === FieldType.Bool) return fc.boolean();
      if (f.type === FieldType.Date)
        return fc.date().map((x) => x.toISOString().substring(0, 10));
      if (f.type === FieldType.DateTime)
        return fc.date().map((x) => x.toISOString());
      if (f.type === FieldType.Time)
        return fc.date().map((x) => x.toISOString().substring(11));
      if (isCompoundField(f)) {
        return fc.record(
          Object.fromEntries(
            f.children.map((x) => [
              x.field,
              randomValueForField(x, childConstraints),
            ]),
          ),
        );
      }
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
