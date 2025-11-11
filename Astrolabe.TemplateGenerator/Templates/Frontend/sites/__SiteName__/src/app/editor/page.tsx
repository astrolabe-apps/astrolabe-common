"use client";

import "flexlayout-react/style/light.css";
import { BasicFormEditor, readOnlySchemas } from "@astroapps/schemas-editor";
import { ControlDefinitionSchemaMap, SchemaMap } from "client-common/schemas";
import { FormDefinitions } from "client-common/formdefs";
import { theme } from "client-common/tailwind";
import { createStdFormRenderer } from "@/renderers";
import {
  convertStringParam,
  useApiClient,
  useQueryControl,
  useSyncParam,
} from "@astroapps/client";
import { DefaultRendererOptions } from "@react-typed-forms/schemas-html";
import {
  ControlDefinition,
  createSchemaLookup,
} from "@react-typed-forms/schemas";
import { CodeGenClient } from "client-common";
import { useMemo, useState } from "react";

export type FormType = keyof typeof FormDefinitions;

const defaults = {
  label: {
    className: "",
    groupLabelClass: "",
  },
  group: {
    standardClassName: "",
  },
} as DefaultRendererOptions;
export const formStyles = {
  defaults: defaults,
};
const defaultForm: FormType = Object.keys(FormDefinitions)[0] as FormType;

const schemas = createSchemaLookup(SchemaMap);
export default function EditorPage() {
  const client = useApiClient(CodeGenClient);
  const query = useQueryControl();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const StdFormRenderer = useMemo(
    () => createStdFormRenderer(container),
    [container],
  );

  if (!query.fields.isReady.value) return <></>;
  const currentForm = useSyncParam(
    query,
    "current",
    convertStringParam<FormType>(
      (a) => a,
      (a) => a as FormType,
      defaultForm,
    ),
  );

  return (
    <div className="h-screen">
      <div id="dialog_container" ref={setContainer} />
      <BasicFormEditor<FormType>
        selectedForm={currentForm}
        formTypes={Object.entries(FormDefinitions).map(([key, value]) => ({
          id: key,
          name: (value as any).name,
        }))}
        formRenderer={StdFormRenderer}
        loadSchema={readOnlySchemas(SchemaMap)}
        loadForm={async (formType: FormType) => {
          return FormDefinitions[formType];
        }}
        editorPanelClass="bg-surface-100"
        controlsClass="bg-white w-[648px] m-8"
        tailwindConfig={{ theme }}
        handleIcon={<i className="fa fa-ellipsis-v cursor-grabbing" />}
        saveForm={async (
          controls: ControlDefinition[],
          formType: FormType,
          config,
          fields,
        ) => {
          await client.saveForm(formType, {
            controls,
            config,
            fields,
          });
        }}
      />
    </div>
  );
}
