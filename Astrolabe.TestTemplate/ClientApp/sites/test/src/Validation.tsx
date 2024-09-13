import { useControl } from "@react-typed-forms/core";
import {
  buildSchema,
  ControlRenderer,
  createDefaultRenderers,
  createFormRenderer,
  dataControl,
  DateComparison,
  dateField,
  dateTimeField,
  dateValidatorOptions,
  defaultTailwindTheme,
  groupedControl,
  jsonataValidatorOptions,
  lengthValidatorOptions,
  stringField,
} from "@react-typed-forms/schemas";
import React, { useContext } from "react";
import { RenderFormContext } from "./formTree";

interface AllControls {
  text: string;
  textRequired?: string;
  stringArray?: string[];
  notBeforeDate?: string;
  notAfterDate?: string;
  dateTime?: string;
}

const Schema = buildSchema<AllControls>({
  text: stringField("Text"),
  textRequired: stringField("Text Required"),
  notBeforeDate: dateField("NotBeforeDate"),
  notAfterDate: dateField("NotAfterDate"),
  dateTime: dateTimeField("Date Time Not Before"),
  stringArray: stringField("String Array", { collection: true }),
});

const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

const allGroup = groupedControl([
  dataControl("text", null, {
    validators: [lengthValidatorOptions({ min: 5, max: 15 })],
  }),
  dataControl("textRequired", null, {
    required: true,
  }),
  dataControl("notBeforeDate", "Not before today", {
    validators: [
      dateValidatorOptions({ comparison: DateComparison.NotBefore }),
    ],
  }),
  dataControl("notAfterDate", "Not after tomorrow", {
    validators: [
      dateValidatorOptions({
        comparison: DateComparison.NotAfter,
        daysFromCurrent: 1,
      }),
    ],
  }),
  dataControl("dateTime", null, {
    validators: [
      dateValidatorOptions({
        comparison: DateComparison.NotBefore,
        fixedDate: "1980-04-22",
      }),
    ],
  }),
  dataControl("stringArray", null, {
    validators: [
      lengthValidatorOptions({ min: 2, max: 4 }),
      jsonataValidatorOptions({
        expression:
          "$count(stringArray) != 4 or text = 'Please' ? null : 'Jsonata says no' ",
      }),
    ],
  }),
]);

export function Validation() {
  const control = useControl<AllControls>({
    text: "",
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
      <div>
        <button id="forceTouched" onClick={() => (control.touched = true)}>
          Force touched
        </button>
        <pre>{JSON.stringify(control.value)}</pre>
      </div>
    </div>
  );
}
