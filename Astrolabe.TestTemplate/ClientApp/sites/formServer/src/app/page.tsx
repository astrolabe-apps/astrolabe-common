"use client";

import {
  applyEditorExtensions,
  BasicFormEditor,
  ControlDefinitionSchema,
} from "@astroapps/schemas-editor";
import { newControl, useControl } from "@react-typed-forms/core";
import {
  boolField,
  buildSchema,
  compoundField,
  createDefaultRenderers,
  createDisplayRenderer,
  createFormRenderer,
  dateField,
  dateTimeField,
  defaultSchemaInterface,
  defaultTailwindTheme,
  doubleField,
  FieldType,
  intField,
  makeScalarField,
  stringField,
  timeField,
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
import { useMemo, useState } from "react";
import {
  DataGridRenderer,
  DataGridExtension,
} from "@astroapps/schemas-datagrid";

const CustomControlSchema = applyEditorExtensions(DataGridExtension);

function createStdFormRenderer(container: HTMLElement | null) {
  return createFormRenderer(
    [
      DataGridRenderer,
      createDatePickerRenderer(undefined, {
        portalContainer: container ? container : undefined,
      }),
    ],
    createDefaultRenderers({
      ...defaultTailwindTheme,
    }),
  );
}

interface TestSchema {
  array: number[];
  text: string;
  number: number;
}

const TestSchema = buildSchema<TestSchema>({
  array: intField("Numbers", { collection: true }),
  text: stringField("String"),
  number: doubleField("Double"),
});

export default function Editor() {
  const qc = useQueryControl();
  const selectedForm = useControl("Test");
  const [container, setContainer] = useState<HTMLElement | null>(null);
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
  const StdFormRenderer = useMemo(
    () => createStdFormRenderer(container),
    [container],
  );
  return (
    <DndProvider backend={HTML5Backend}>
      <div id="dialog_container" ref={setContainer} />
      <BasicFormEditor<string>
        formRenderer={StdFormRenderer}
        editorRenderer={StdFormRenderer}
        // handleIcon={<div>WOAH</div>}
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
          customDisplay: (customId) => <div>DIS ME CUSTOMID: {customId}</div>,
        }}
        controlDefinitionSchemaMap={CustomControlSchema}
        editorControls={controlsJson}
      />
    </DndProvider>
  );
}
