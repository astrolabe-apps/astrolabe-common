"use client";

import { saveAs } from "file-saver";
import {
  applyEditorExtensions,
  BasicFormEditor,
  ControlDefinitionSchema,
} from "@astroapps/schemas-editor";
import {
  Control,
  ensureSelectableValues,
  Fcheckbox,
  RenderElements,
  useComputed,
  useControl,
  useSelectableArray,
} from "@react-typed-forms/core";
import {
  boolField,
  buildSchema,
  compoundField,
  ControlDataContext,
  ControlDefinition,
  createSchemaLookup,
  dateField,
  dateTimeField,
  defaultEvalHooks,
  doubleField,
  EntityExpression,
  ExpressionType,
  intField,
  makeEvalExpressionHook,
  stringField,
  stringOptionsField,
  timeField,
  UserMatchExpression,
  withScalarOptions,
} from "@react-typed-forms/schemas";
import { useQueryControl } from "@astroapps/client/hooks/useQueryControl";
import {
  convertStringParam,
  useSyncParam,
} from "@astroapps/client/hooks/queryParamSync";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import {
  CarClient,
  CarEdit,
  CodeGenClient,
  SearchStateClient,
} from "../client";
import controlsJson from "../ControlDefinition.json";
import { useMemo, useState } from "react";
import { DataGridExtension, PagerExtension } from "@astroapps/schemas-datagrid";
import { FormDefinitions } from "../forms";
import { createStdFormRenderer } from "../renderers";
import { QuickstreamExtension } from "@astroapps/schemas-quickstream";
import { SchemaMap } from "../schemas";
import { Button } from "@astrolabe/ui/Button";
import { useApiClient } from "@astroapps/client/hooks/useApiClient";

const CustomControlSchema = applyEditorExtensions(
  DataGridExtension,
  QuickstreamExtension,
  PagerExtension,
);

interface DisabledStuff {
  type: string;
  disable: boolean;
  text: string;
  options: string[];
}
interface TestSchema {
  date: string;
  dateTime: string;
  time: string;
  array: number[];
  stuff: DisabledStuff[];
  number: number;
}

const TestSchema = buildSchema<TestSchema>({
  date: dateField("Date"),
  dateTime: dateTimeField("Date Time"),
  time: timeField("Time"),
  array: intField("Numbers", { collection: true }),
  stuff: compoundField(
    "Stuff",
    buildSchema<DisabledStuff>({
      type: withScalarOptions(
        { isTypeField: true },
        stringOptionsField("Type", { name: "Some", value: "some" }),
      ),
      disable: boolField("Disable", { onlyForTypes: ["some"] }),
      text: stringField("Pure Text"),
      options: withScalarOptions(
        { collection: true },
        stringOptionsField(
          "String",
          { name: "One", value: "one", group: "Number2" },
          { name: "Two", value: "two", group: "Number1" },
          { name: "Two", value: "3", group: "Number1" },
          { name: "Two", value: "4", group: "Number2" },
          { name: "Two", value: "5", group: "a" },
        ),
      ),
    }),
    { collection: true },
  ),
  number: doubleField("Double"),
});

interface SearchResult extends CarEdit {}

interface SearchRequest {
  sort: string[];
  filters: string[];
}
interface GridSchema {
  request: SearchRequest;
  results: SearchResult[];
}

const ResultSchema = buildSchema<SearchResult>({
  make: stringField("Make"),
  model: stringField("Model"),
  year: intField("Year"),
});

const RequestSchema = buildSchema<SearchRequest>({
  sort: stringField("Sort", { collection: true }),
  filters: stringField("Filters", { collection: true }),
});

const GridSchema = buildSchema<GridSchema>({
  results: compoundField("Results", ResultSchema, { collection: true }),
  request: compoundField("Request", RequestSchema),
});

const schemaLookup = createSchemaLookup({
  TestSchema,
  GridSchema,
  RequestSchema,
  ResultSchema,
  ControlDefinitionSchema,
  ...SchemaMap,
});

export default function Editor() {
  const carClient = useApiClient(CarClient);
  const qc = useQueryControl();
  const selectedForm = useControl("Test");
  const roles = useControl<string[]>([]);
  const rolesSelectable = useSelectableArray(
    roles,
    ensureSelectableValues(["Student", "Teacher"], (x) => x),
  );
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useSyncParam(
    qc,
    selectedForm,
    "form",
    convertStringParam(
      (x) => x,
      (x) => x,
      "Grid",
    ),
  );
  const StdFormRenderer = useMemo(
    () => createStdFormRenderer(container),
    [container],
  );
  const evalHook = useMemo(() => makeEvalExpressionHook(evalExpr), [roles]);
  return (
    <DndProvider backend={HTML5Backend}>
      <div id="dialog_container" ref={setContainer} />
      <BasicFormEditor<string>
        formRenderer={StdFormRenderer}
        editorRenderer={StdFormRenderer}
        schemas={schemaLookup}
        // handleIcon={<div>WOAH</div>}
        loadForm={async (c) => {
          if (c in FormDefinitions)
            return FormDefinitions[c as keyof typeof FormDefinitions];
          switch (c) {
            case "ControlDefinitionSchema":
              return {
                schemaName: "ControlDefinitionSchema",
                controls: controlsJson,
              };
            default:
              return { schemaName: c, controls: [] };
          }
        }}
        selectedForm={selectedForm}
        formTypes={[
          ["ControlDefinitionSchema", "EditorControls"],
          ["CarInfo", "Pdf test"],
          ["TestSchema", "Test"],
          ["GridSchema", "Grid"],
          ...Object.values(FormDefinitions).map(
            (x) => [x.value, x.name] as [string, string],
          ),
        ]}
        validation={async (data) => {
          data.touched = true;
          data.clearErrors();
          data.validate();
        }}
        saveForm={async (controls) => {
          if (selectedForm.value === "EditorControls") {
            await new CodeGenClient().editControlDefinition(controls);
          } else {
            if (selectedForm.value !== "Test") {
              await new SearchStateClient().editControlDefinition(
                selectedForm.value,
                { controls, config: null },
              );
            }
          }
        }}
        previewOptions={{
          actionOnClick: (aid, data) => () => console.log("Clicked", aid, data),
          customDisplay: (customId) => <div>DIS ME CUSTOMID: {customId}</div>,
          useEvalExpressionHook: evalHook,
        }}
        controlDefinitionSchemaMap={CustomControlSchema}
        editorControls={controlsJson}
        extraPreviewControls={(c, data) => (
          <div>
            <RenderElements control={rolesSelectable}>
              {(c) => (
                <div>
                  <Fcheckbox control={c.fields.selected} />{" "}
                  {c.fields.value.value}
                </div>
              )}
            </RenderElements>
            <Button onClick={() => genPdf(c, data)}>PDF</Button>
          </div>
        )}
      />
    </DndProvider>
  );

  async function genPdf(c: ControlDefinition[], data: Control<any>) {
    const file = await carClient.generatePdf({
      controls: c as any[],
      schemaName: selectedForm.value,
      data: data.value,
    });
    saveAs(file.data, file.fileName);
  }
  function fromFormJson(c: keyof typeof FormDefinitions) {
    return FormDefinitions[c];
  }
  function evalExpr(
    expr: EntityExpression,
    context: ControlDataContext,
    coerce: (v: any) => any,
  ) {
    switch (expr.type) {
      case ExpressionType.UserMatch:
        return useComputed(() => {
          return coerce(
            roles.value.includes((expr as UserMatchExpression).userMatch),
          );
        });
      default:
        return defaultEvalHooks(expr, context, coerce);
    }
  }
}
