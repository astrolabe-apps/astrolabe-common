import { useControl } from "@react-typed-forms/core";
import {
  accordionOptions,
  addMissingControls,
  applyDefaultValues,
  buildSchema,
  checkListOptions,
  cleanDataForSchema,
  compoundField,
  ControlRenderer,
  createDefaultRenderers,
  createFormRenderer,
  dataControl,
  DataRenderType,
  dateField,
  dateTimeField,
  defaultTailwindTheme,
  displayOnlyOptions,
  doubleField,
  groupedControl,
  htmlDisplayControl,
  intField,
  jsonataOptions,
  lengthValidatorOptions,
  radioButtonOptions,
  resolveSchemas,
  stringField,
  stringOptionsField,
  textDisplayControl,
  textfieldOptions,
  timeField,
  withScalarOptions,
} from "@react-typed-forms/schemas";
import React from "react";
import { applyEditorExtensions } from "@astroapps/schemas-editor";
import { DataGridExtension } from "@astroapps/schemas-datagrid";

enum Choice {
  Cool = "Cool",
  Uncool = "Uncool",
}

interface ChildData {
  choice?: Choice | null;
  another: number;
}
interface AllControls {
  type: string;
  text: string;
  double: number;
  int: number;
  compound: ChildData;
  compoundArray: ChildData[];
}

const CompoundSchema = buildSchema<ChildData>({
  choice: withScalarOptions(
    {
      defaultValue: Choice.Cool,
      required: true,
      tags: ["_ControlGroup:Secondary"],
    },
    stringOptionsField(
      "Choice",
      { name: "This is cool", value: Choice.Cool },
      { name: "So uncool", value: Choice.Uncool },
    ),
  ),
  another: intField("Int"),
});

const { Schema } = resolveSchemas({
  CompoundSchema,
  Schema: buildSchema<AllControls>({
    type: stringField("Type", { isTypeField: true }),
    text: stringField("Text", { defaultValue: "text" }),
    double: doubleField("Double", { defaultValue: 1 }),
    int: intField("Int", { notNullable: true }),
    compound: compoundField("Compound", [], {
      notNullable: true,
      required: true,
      schemaRef: "CompoundSchema",
    }),
    compoundArray: compoundField("Compound Array", [], {
      collection: true,
      notNullable: true,
      schemaRef: "CompoundSchema",
    }),
  }),
});

const control = applyDefaultValues({ compound: { intField: 1 } }, Schema);
const control2 = applyDefaultValues(undefined, Schema);
const cleaned = cleanDataForSchema(control, Schema, true);
const definition = addMissingControls(Schema, [
  dataControl("compound"),
  dataControl("compound", "Secondary"),
]);
export function Schemas() {
  return (
    <div className="container">
      <pre id="control">{JSON.stringify(control)}</pre>
      <pre id="control2">{JSON.stringify(control2)}</pre>
      <pre id="cleaned">{JSON.stringify(cleaned)}</pre>
      <pre id="definition">{JSON.stringify(definition)}</pre>
    </div>
  );
}
