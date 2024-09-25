import { useControl } from "@react-typed-forms/core";
import {
  accordionOptions,
  actionControl,
  buildSchema,
  checkListOptions,
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
  radioButtonOptions,
  stringField,
  stringOptionsField,
  textDisplayControl,
  textfieldOptions,
  timeField,
  withScalarOptions,
} from "@react-typed-forms/schemas";
import React, { useContext } from "react";
import { applyEditorExtensions } from "@astroapps/schemas-editor";
import { DataGridExtension } from "@astroapps/schemas-datagrid";
import { RenderFormContext } from "./formTree";

enum Choice {
  Cool = "Cool",
  Uncool = "Uncool",
}

enum NumberChoice {
  Cool = 1,
  Uncool = 2,
}

interface AllControls {
  text: string;
  double: number;
  int: number;
  date?: string;
  dateTime?: string;
  time?: string;
  stringArray: string[];
  choice?: Choice | null;
  radioChoice?: Choice;
  multiChoice?: NumberChoice[];
  multiline?: string;
}

const Schema = buildSchema<AllControls>({
  text: stringField("Text"),
  double: doubleField("Double"),
  int: intField("Int"),
  date: dateField("Date"),
  dateTime: dateTimeField("Date Time"),
  time: timeField("Time"),
  stringArray: stringField("String", { collection: true }),
  choice: stringOptionsField(
    "Choice",
    { name: "This is cool", value: Choice.Cool },
    { name: "So uncool", value: Choice.Uncool },
  ),
  radioChoice: stringOptionsField(
    "Radio Choice",
    { name: "Different cool", value: Choice.Cool },
    { name: "Sucks", value: Choice.Uncool },
  ),
  multiChoice: withScalarOptions(
    {
      collection: true,
      notNullable: false,
      options: [
        { name: "Correct Choice", value: NumberChoice.Cool },
        { name: "Bad Choice", value: NumberChoice.Uncool },
      ],
    },
    intField("Multi Choice"),
  ),
  multiline: stringField("Multiline"),
});

const CustomControlSchema = applyEditorExtensions(DataGridExtension);

const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

const allGroup = groupedControl([
  dataControl("text"),
  // dataControl("int"),
  // dataControl("double"),
  // dataControl("date", null, {
  //     adornments: [
  //         accordionOptions({ title: "Hide Date", defaultExpanded: true }),
  //     ],
  // }),
  // dataControl("dateTime"),
  // dataControl("time"),
  // dataControl("stringArray", "String"),
  // dataControl("choice", "Can choose?", {
  //     renderOptions: { type: DataRenderType.NullToggle },
  // }),
  // dataControl("choice"),
  // dataControl("radioChoice", "Radio Choice", radioButtonOptions({})),
  // dataControl("multiChoice", "Multi Choice", checkListOptions({})),
  // dataControl(
  //     "multiline",
  //     "Multiline textfield",
  //     textfieldOptions({ multiline: true }),
  // ),
  // dataControl(
  //     "double",
  //     "Jsonata control",
  //     jsonataOptions({
  //         expression: '"<b>Jsonata value: " & $value & "</b>"',
  //     }),
  // ),
  // dataControl(
  //     "date",
  //     "Date display",
  //     displayOnlyOptions({ emptyText: "No date" }),
  // ),
  // dataControl(
  //     "dateTime",
  //     "Datetime display",
  //     displayOnlyOptions({ emptyText: "No datetime" }),
  // ),
  // dataControl(
  //     "time",
  //     "Time display",
  //     displayOnlyOptions({ emptyText: "No time" }),
  // ),
  // textDisplayControl("This is some plain text", { styleClass: "text-display" }),
  // htmlDisplayControl('<b class="html-display">Html display</b>'),
  // actionControl("Do something", "doSomething", {
  //     adornments: [accordionOptions({ title: "Show action" })],
  // }),
]);

export function SimpleControls() {
  const control = useControl<AllControls>({
    text: "",
    int: 1,
    double: 2.5,
    stringArray: [],
  });
  const ControlRenderer = useContext(RenderFormContext);
  return (
    <div className="container">
      <ControlRenderer
        definition={allGroup}
        fields={Schema}
        renderer={formRenderer}
        control={control}
      />
      <pre>{JSON.stringify(control.value)}</pre>
    </div>
  );
}
