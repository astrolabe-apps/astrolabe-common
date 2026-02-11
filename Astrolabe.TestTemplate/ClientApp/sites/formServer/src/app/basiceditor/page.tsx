"use client";

import { useMemo, useState } from "react";
import { BasicFormEditor } from "@astroapps/basic-editor";
import { readOnlySchemas } from "@astroapps/schemas-editor";
import {
  boolField,
  buildSchema,
  ControlDefinition,
  dateField,
  SchemaField,
  stringField,
  stringOptionsField,
  withScalarOptions,
} from "@react-typed-forms/schemas";
import { createStdFormRenderer } from "../../renderers";
import { SchemaMap } from "../../schemas";
import { FormDefinitions } from "../../forms";
import { useControl } from "@react-typed-forms/core";

interface SampleForm {
  name: string;
  email: string;
  role: string;
  active: boolean;
  startDate: string;
}

const SampleSchema = buildSchema<SampleForm>({
  name: stringField("Name"),
  email: stringField("Email"),
  role: withScalarOptions(
    {},
    stringOptionsField(
      "Role",
      { name: "Admin", value: "admin" },
      { name: "User", value: "user" },
      { name: "Guest", value: "guest" },
    ),
  ),
  active: boolField("Active"),
  startDate: dateField("Start Date"),
});

const schemaLookup: Record<string, SchemaField[]> = {
  SampleSchema,
  ...SchemaMap,
};

const savedForms: Record<
  string,
  { controls: ControlDefinition[]; formFields: SchemaField[] }
> = {};

export default function BasicEditorPage() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const formId = useControl("SampleSchema");

  const renderer = useMemo(
    () => createStdFormRenderer(container),
    [container],
  );

  return (
    <div className="h-screen flex flex-col">
      <div id="dialog_container" ref={setContainer} />
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-white">
        <span className="font-semibold text-sm">Form:</span>
        <select
          className="text-sm border rounded px-2 py-1"
          value={formId.value}
          onChange={(e) => (formId.value = e.target.value)}
        >
          <option value="SampleSchema">Sample Form</option>
          {Object.entries(FormDefinitions).map(([key, fd]) => (
            <option key={key} value={key}>
              {fd.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <BasicFormEditor
          formRenderer={renderer}
          loadForm={async (fId) => {
            if (fId in FormDefinitions) {
              const fd =
                FormDefinitions[fId as keyof typeof FormDefinitions];
              return {
                controls: fd.controls,
                schemaName: fd.schemaName,
                formFields: fd.formFields,
              };
            }
            const saved = savedForms[fId];
            return {
              controls: saved?.controls ?? [],
              schemaName: fId,
              formFields: saved?.formFields ?? [],
            };
          }}
          loadSchema={readOnlySchemas(schemaLookup)}
          saveForm={async (controls, fId, config, formFields) => {
            savedForms[fId] = { controls, formFields };
            console.log("Saved form", fId, { controls, formFields });
          }}
          formId={formId.value}
          formTitle={
            formId.value in FormDefinitions
              ? FormDefinitions[
                  formId.value as keyof typeof FormDefinitions
                ].name
              : "Sample Form"
          }
          className="h-full"
        />
      </div>
    </div>
  );
}