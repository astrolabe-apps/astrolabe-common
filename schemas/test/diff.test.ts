import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  makeDataNode,
  newIndexes,
  valuesAndSchema,
  valueSchemaAndChange,
} from "./gen";
import {
  collectDifferences,
  getAllValues,
  getDiffObject,
  getTagParam,
  isCompoundNode,
  SchemaDataNode,
  SchemaTags,
} from "../src";
import {
  deepEquals,
  newElement,
  updateElements,
} from "@react-typed-forms/core";

describe("diff", () => {
  it("unchanged value always returns undefined", () => {
    fc.assert(
      fc.property(valueSchemaAndChange(), (fv) => {
        const dataNode = makeDataNode(fv);
        collectDifferences(dataNode, [fv.value]);
        expect(getDiffObject(dataNode)).toBeUndefined();
        expect(dataNode.control.meta.changes).toStrictEqual(undefined);
      }),
    );
  });

  it("primitive value always returns new value", () => {
    fc.assert(
      fc.property(
        valueSchemaAndChange({ arrayChance: 0, compoundChance: 0 }),
        (fv) => {
          const dataNode = makeDataNode(fv);
          const control = dataNode.control!;
          control.setValue((x) => fv.newValue);
          expect(getDiffObject(dataNode)).toBe(control.value);
        },
      ),
    );
  });

  it("compound fields only return changed values", () => {
    fc.assert(
      fc.property(
        valueSchemaAndChange({
          arrayChance: 0,
          compoundChance: 0,
          forceCompound: true,
        }),
        (fv) => {
          const dataNode = makeDataNode(fv);
          const control = dataNode.control!;
          control.value = fv.newValue;
          const changed = dataNode.schema
            .getChildNodes()
            .map((x) => x.field.field)
            .filter((x) => fv.value?.[x] !== fv.newValue?.[x])
            .map((x) => [x, fv.newValue?.[x]]);
          expect(getDiffObject(dataNode)).toStrictEqual(
            changed.length ? Object.fromEntries(changed) : undefined,
          );
        },
      ),
    );
  });

  it("array compound with id field always returns id field and changes", () => {
    fc.assert(
      fc.property(
        valueSchemaAndChange({
          forceArray: true,
          forceCompound: true,
          arrayChance: 0,
          compoundChance: 0,
          idField: true,
        }),
        (fv) => {
          const dataNode = makeDataNode(fv);
          const arrayControl = dataNode.control!;
          arrayControl.value = fv.newValue;
          const idField = getTagParam(
            dataNode.schema.field,
            SchemaTags.IdField,
          );
          const origValues = (fv.value ?? []) as any[];
          const newValues = (fv.newValue ?? []) as any[];
          const expected = newValues.map((nv, i) => {
            if (nv == null) return null;
            return objectDiff(dataNode, origValues[i], nv, idField);
          });
          expect(getDiffObject(dataNode)).toStrictEqual(
            arrayControl.dirty ? expected : undefined,
          );
        },
      ),
    );
  });

  it("array without id always returns array index edit format", () => {
    fc.assert(
      fc.property(
        valueSchemaAndChange({
          forceArray: true,
          forceCompound: true,
          arrayChance: 0,
          compoundChance: 0,
        })
          .filter((x) => !deepEquals(x.newValue, x.value) && x.value != null)
          .chain((x) => newIndexes(x.value.length).map((i) => [x, i] as const)),
        ([fv, indexes]) => {
          const dataNode = makeDataNode(fv);
          const arrayControl = dataNode.control!.as<any[]>();
          const newValue = fv.newValue as any[];
          const results = Array.from({ length: newValue.length });
          updateElements(arrayControl, (x) => {
            const sorted = indexes.map((ni, i) => {
              const c = x[ni];
              c.value = newValue[i];
              results[i] = {
                old: ni,
                edit: objectDiff(dataNode, c.initialValue, c.value),
              };
              return c;
            });
            while (newValue.length > sorted.length) {
              const ne = newElement(arrayControl, undefined);
              ne.value = newValue[sorted.length];
              results[sorted.length] = { old: undefined, edit: ne.value };
              sorted.push(ne);
            }
            return sorted;
          });
          expect(getDiffObject(dataNode)).toStrictEqual(results);
        },
      ),
    );
  });

  it("primitive node collects all changes", () => {
    fc.assert(
      fc.property(
        valuesAndSchema({
          forceArray: false,
          arrayChance: 0,
          compoundChance: 0,
        }),
        (fv) => {
          const dataNode = makeDataNode(fv);
          const distinct = [dataNode.control.value];
          collectDifferences(dataNode, [fv.value, ...fv.newValues]);
          fv.newValues.forEach((x) => {
            if (!distinct.includes(x)) distinct.push(x);
          });
          expect(getAllValues(dataNode.control).value).toStrictEqual(distinct);
        },
      ),
    );
  });

  it("compound node collects child changes", () => {
    fc.assert(
      fc.property(
        valuesAndSchema({
          forceArray: false,
          forceCompound: true,
          arrayChance: 0,
          compoundChance: 50,
        }),
        (fv) => {
          const dataNode = makeDataNode(fv);
          const allValues = [fv.value, ...fv.newValues];
          collectDifferences(dataNode, allValues);
          checkCompound(dataNode, allValues);
        },
      ),
    );
  });
});

function checkCompound(node: SchemaDataNode, newValues: any[]) {
  node.schema.getChildNodes().forEach((x) => {
    const childNode = node.getChild(x);
    if (isCompoundNode(childNode.schema)) {
      checkCompound(
        childNode,
        newValues.map((n) => n?.[x.field.field]),
      );
    } else {
      let distinct: any[] = [];
      newValues.forEach((newValue) => {
        const nv = newValue?.[x.field.field];
        if (!distinct.includes(nv)) distinct.push(nv);
      });
      expect(getAllValues(childNode.control).value).toStrictEqual(distinct);
    }
  });
}

function objectDiff(
  dataNode: SchemaDataNode,
  oldValue: Record<string, any> | undefined | null,
  newValue: Record<string, any> | undefined | null,
  idField?: string,
) {
  if (newValue == null) return oldValue == null ? undefined : newValue;
  const changed = dataNode.schema
    .getChildNodes()
    .map((x) => x.field.field)
    .filter((x) => x == idField || oldValue?.[x] !== newValue[x])
    .map((x) => [x, newValue[x]]);
  return changed.length ? Object.fromEntries(changed) : undefined;
}
