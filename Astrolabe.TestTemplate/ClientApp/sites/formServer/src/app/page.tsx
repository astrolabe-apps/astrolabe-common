"use client";

import {
  applyEditorExtensions,
  BasicFormEditor,
  ControlDefinitionSchema,
} from "@astroapps/schemas-editor";
import { newControl, useControl } from "@react-typed-forms/core";
import {
  buildSchema,
  compoundField,
  createDefaultRenderers,
  createDisplayRenderer,
  createFormRenderer,
  dateField,
  dateTimeField,
  defaultSchemaInterface,
  defaultTailwindTheme,
  FieldType,
  intField,
  makeScalarField,
  visitControlData,
} from "@react-typed-forms/schemas";
import { useQueryControl } from "@astroapps/client/hooks/useQueryControl";
import {
  convertStringParam,
  useSyncParam,
} from "@astroapps/client/hooks/queryParamSync";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import { Client } from "../client";
import controlsJson from "../ControlDefinition.json";
import { createDatePickerRenderer } from "@astroapps/schemas-datepicker";

const CustomControlSchema = applyEditorExtensions({});

const customDisplay = createDisplayRenderer(
  (p) => <div>PATH: {p.dataContext.path.join(",")}</div>,
  { renderType: "Custom" },
);

const StdFormRenderer = createFormRenderer(
  [customDisplay, createDatePickerRenderer()],
  createDefaultRenderers({
    ...defaultTailwindTheme,
  }),
);

interface TestSchema {
  things: {
    sub: {
      thingId: string;
      other: number;
    };
  };
  date: string;
  dateTime: string;
}

const TestSchema = buildSchema<TestSchema>({
  dateTime: dateTimeField("Date and Time"),
  date: dateField("Date Only"),
  things: compoundField(
    "Things",

    buildSchema<TestSchema["things"]>({
      sub: compoundField(
        "Sub",
        buildSchema<TestSchema["things"]["sub"]>({
          thingId: makeScalarField({
            type: FieldType.String,
            options: [
              { name: "One", value: "one" },
              { name: "Two", value: "two" },
            ],
          }),
          other: intField("Test drop down", { required: true }),
        }),
      ),
    }),
  ),
});

export default function Editor() {
  const qc = useQueryControl();
  const selectedForm = useControl("Test");
  useSyncParam(
    qc,
    selectedForm,
    "form",
    convertStringParam(
      (x) => x,
      (x) => x,
      "Test",
    ),
  );
  return (
    <DndProvider backend={HTML5Backend}>
      <BasicFormEditor<string>
        formRenderer={StdFormRenderer}
        editorRenderer={StdFormRenderer}
        loadForm={async (c) => {
          return c === "EditorControls"
            ? {
                fields: ControlDefinitionSchema,
                controls: controlsJson,
              }
            : { fields: TestSchema, controls: [] };
        }}
        selectedForm={selectedForm}
        formTypes={[
          ["EditorControls", "EditorControls"],
          ["Test", "Test"],
        ]}
        validation={async (data) => {
          data.touched = true;
          data.clearErrors();
          data.validate();
        }}
        saveForm={async (controls) => {
          if (selectedForm.value === "EditorControls") {
            await new Client().controlDefinition(controls);
          }
        }}
        previewOptions={{
          actionOnClick: (aid, data) => () => console.log("Clicked", aid, data),
        }}
        controlDefinitionSchemaMap={CustomControlSchema}
        editorControls={controlsJson}
      />
    </DndProvider>
  );
}
