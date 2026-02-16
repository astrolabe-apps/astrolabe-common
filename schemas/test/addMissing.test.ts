import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { randomSchemaField } from "./gen";
import {
  addMissingControls,
  CompoundField,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  FieldType,
  SchemaField,
  SchemaTags,
} from "../src";

describe("addMissing", () => {
  it("new control added for missing node, no control added if already there", () => {
    fc.assert(
      fc.property(randomSchemaField({ compoundChance: 0 }), (fv) => {
        const controls = addMissingControls([fv], []);
        expect(controls).toHaveLength(1);
        expect(addMissingControls([fv], controls)).toHaveLength(1);
      }),
    );
  });

  it("adds control for treeChildren compound field with onlyForTypes", () => {
    // Schema mimicking EntityExpressionSchema
    const schema: SchemaField[] = [
      {
        field: "type",
        type: FieldType.String,
        displayName: "Type",
        isTypeField: true,
      },
      {
        field: "expression",
        type: FieldType.String,
        displayName: "Expression",
      },
      {
        field: "field",
        type: FieldType.String,
        displayName: "Field",
      },
      {
        field: "innerExpression",
        type: FieldType.Compound,
        displayName: "Inner Expression",
        treeChildren: true,
        onlyForTypes: ["Not"],
        children: [],
        tags: ["_ControlRef:/ExpressionForm"],
      } as CompoundField,
    ];

    // Start with controls for the scalar fields only (no innerExpression control)
    const existingControls = [
      {
        type: ControlDefinitionType.Data,
        field: "type",
        title: "Type",
        renderOptions: { type: DataRenderType.Standard },
      } as DataControlDefinition,
      {
        type: ControlDefinitionType.Data,
        field: "expression",
        title: "Expression",
        renderOptions: { type: DataRenderType.Standard },
      } as DataControlDefinition,
      {
        type: ControlDefinitionType.Data,
        field: "field",
        title: "Field",
        renderOptions: { type: DataRenderType.Standard },
      } as DataControlDefinition,
    ];

    const warnings: string[] = [];
    const result = addMissingControls(schema, existingControls, (m) =>
      warnings.push(m),
    );

    // Should have added a control for innerExpression
    expect(result).toHaveLength(4);
    const innerCtrl = result[3] as DataControlDefinition;
    expect(innerCtrl.field).toBe("innerExpression");
    expect(innerCtrl.title).toBe("Inner Expression");
    // Should have childRefId from _ControlRef tag
    expect(innerCtrl.childRefId).toBe("/ExpressionForm");
    expect(warnings).toHaveLength(0);
  });
});
