import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { makeDataNode, valueAndSchema, valuesAndSchema } from "./gen";
import {
  compoundField,
  defaultControlForField,
  legacyFormNode,
  visitFormDataInContext,
} from "../src";

describe("visit", () => {
  it("null value doesnt visit children", () => {
    fc.assert(
      fc.property(valueAndSchema(), (fv) => {
        const def = defaultControlForField(fv.field);
        const dataNode = makeDataNode({
          field: compoundField("", [fv.field])(""),
          value: { [fv.field.field]: null },
        });
        const collectedValues: any[] = [];
        visitFormDataInContext(dataNode, legacyFormNode(def), (data) => {
          collectedValues.push(data.control.value);
        });
        expect(collectedValues).toStrictEqual([null]);
      }),
    );
  });

  it("non null visits all children", () => {
    fc.assert(
      fc.property(
        valueAndSchema({
          forceCompound: true,
          compoundChance: 0,
          arrayChance: 0,
        }).filter((x) => x.value != null),
        (fv) => {
          const def = defaultControlForField(fv.field);
          const dataNode = makeDataNode({
            field: compoundField("", [fv.field])(""),
            value: { [fv.field.field]: fv.value },
          });
          const collectedValues: any[] = [];
          const expected = [fv.value, ...Object.values(fv.value)];
          visitFormDataInContext(dataNode, legacyFormNode(def), (data) => {
            collectedValues.push(data.control.value);
          });
          expect(collectedValues).toStrictEqual(expected);
        },
      ),
    );
  });

  it("array visits each element", () => {
    fc.assert(
      fc.property(
        valuesAndSchema({
          forceCompound: true,
          compoundChance: 0,
          arrayChance: 0,
          forceArray: true,
          notNullable: true,
        }),
        (fv) => {
          const def = defaultControlForField(fv.field);
          const dataNode = makeDataNode({
            field: compoundField("", [fv.field])(""),
            value: { [fv.field.field]: fv.value },
          });
          const collectedValues: any[] = [];
          const expected = [
            fv.value,
            ...fv.value.flatMap((x: unknown[]) => [x, ...Object.values(x)]),
          ];
          visitFormDataInContext(dataNode, legacyFormNode(def), (data) => {
            collectedValues.push(data.control.value);
          });
          expect(collectedValues).toStrictEqual(expected);
        },
      ),
    );
  });
});
