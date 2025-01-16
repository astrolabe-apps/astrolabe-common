import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { changeValue, makeDataNode, valueAndSchema } from "./gen";
import {
  getDiffObject,
  getTagParam,
  isCompoundNode,
  SchemaDataNode,
  SchemaTags,
} from "../src";
import { Control } from "@react-typed-forms/core";

describe("diff", () => {
  it("unchanged value always returns undefined", () => {
    fc.assert(
      fc.property(valueAndSchema(), (fv) => {
        const dataNode = makeDataNode(fv);
        expect(getDiffObject(dataNode)).toBeUndefined();
      }),
    );
  });

  it("primitive value always returns new value", () => {
    fc.assert(
      fc.property(
        valueAndSchema({ arrayChance: 0, compoundChance: 0 }),
        (fv) => {
          const dataNode = makeDataNode(fv);
          const control = dataNode.control!;
          control.setValue((x) => changeValue(x, dataNode.schema.field));
          expect(getDiffObject(dataNode)).toBe(control.value);
        },
      ),
    );
  });

  it("compound fields only return changed values", () => {
    fc.assert(
      fc.property(
        valueAndSchema({ arrayChance: 0, forceCompound: true }),
        (fv) => {
          const dataNode = makeDataNode(fv);
          const control = dataNode.control!;
          const result = { ...control.value };
          const newValue = { ...control.value };
          dataNode.schema.getChildNodes().forEach((child, i) => {
            const field = child.field;
            const fieldName = field.field;
            if (i % 2 == 0) {
              const nv = changeValue(newValue[fieldName], field);
              newValue[fieldName] = nv;
              result[fieldName] = nv;
            } else {
              delete result[fieldName];
            }
          });
          control.value = newValue;
          expect(getDiffObject(dataNode)).toStrictEqual(result);
        },
      ),
    );
  });

  it("array compound with id field always returns id field and changes", () => {
    fc.assert(
      fc.property(
        valueAndSchema({
          forceArray: true,
          forceCompound: true,
          arrayChance: 0,
          compoundChance: 0,
          idField: true,
        }),
        (fv) => {
          const dataNode = makeDataNode(fv);
          const arrayControl = dataNode.control!;
          let results: any = undefined;
          arrayControl.as<any[]>().elements.forEach((control) => {
            const { newValue, result } = editCompound(control.value, dataNode);
            control.value = newValue;
            if (!results) results = [];
            results.push(result);
          });
          expect(getDiffObject(dataNode)).toStrictEqual(results);
        },
      ),
    );
  });

  it("array without id always returns array index edit format", () => {
    fc.assert(
      fc.property(
        valueAndSchema({
          forceArray: true,
          forceCompound: true,
          arrayChance: 0,
          compoundChance: 0,
        }).chain((fv) => {
          const len = ((fv.value as any[]) ?? []).length;
          return fc
            .record({
              index: fc.integer({ min: 0, max: len }),
              add: len ? fc.boolean() : fc.constant(true),
            })
            .map((x) => ({ ...fv, ...x }));
        }),
        (fv) => {
          const dataNode = makeDataNode(fv);
          const arrayControl = dataNode.control!.as<any[]>();
          let results: any = undefined;
          // if (fv.add || fv.index >= arrayControl.elements.length)
          //   addElement(
          //     arrayControl,
          //     changeValue(undefined, dataNode.schema.field, true),
          //   );
          arrayControl.as<any[]>().elements.forEach((control, i) => {
            let change = undefined;
            if (i % 2 == 0) {
              if (isCompoundNode(dataNode.schema)) {
                const { newValue, result } = editCompound(
                  control.value,
                  dataNode,
                );
                control.value = newValue;
                change = result;
              } else {
                change = changeValue(control.value, dataNode.schema.field);
                control.value = change;
              }
            }
            if (!results) results = [];
            results.push({
              old: i,
              edit: change,
            });
          });
          expect(getDiffObject(dataNode)).toStrictEqual(results);
        },
      ),
    );
  });
});

function editCompound(
  existing: Record<string, any>,
  dataNode: SchemaDataNode,
): { newValue: any; result: any } {
  const idField = getTagParam(dataNode.schema.field, SchemaTags.IdField);
  const result = { ...existing };
  const newValue = { ...existing };
  dataNode.schema.getChildNodes().forEach((child, i) => {
    const field = child.field;
    const fieldName = field.field;
    const shouldChange = i % 2 == 0;
    if (shouldChange || fieldName == idField) {
      let nv = newValue[fieldName];
      if (shouldChange) nv = changeValue(nv, field);
      if (nv === undefined) nv = null;
      newValue[fieldName] = nv;
      result[fieldName] = nv;
    } else {
      delete result[fieldName];
    }
  });
  return { newValue, result };
}
