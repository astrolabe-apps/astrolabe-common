"use client";

import { saveAs } from "file-saver";
import {
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
  dataControl,
  dateField,
  dateTimeField,
  defaultEvalHooks,
  doubleField,
  EntityExpression,
  ExpressionType,
  groupedControl,
  GroupRenderType,
  intField,
  makeEvalExpressionHook,
  SchemaTags,
  stringField,
  stringOptionsField,
  timeField,
  UserMatchExpression,
  withScalarOptions,
} from "@react-typed-forms/schemas";
import { useQueryControl } from "@astroapps/client";
import { convertStringParam, useSyncParam } from "@astroapps/client";
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
import { useApiClient } from "@astroapps/client";

const Extensions = [DataGridExtension, QuickstreamExtension, PagerExtension];

interface TabSchema {
  value1: string;
  value2: string;
}

interface DisabledStuff {
  type: string;
  disable: boolean;
  text: string;
  options: string[];
}

interface NestedSchema {
  data: string;
}
interface TestSchema {
  date: string;
  dateTime: string;
  time: string;
  array: number[];
  stuff: DisabledStuff[];
  number: number;
  nested: NestedSchema;
}

const TestSchema = buildSchema<TestSchema>({
  date: dateField("Date"),
  dateTime: dateTimeField("Date Time"),
  time: timeField("Time", { tags: [SchemaTags.ControlGroup + "Nested"] }),
  array: intField("Numbers", { collection: true }),
  stuff: compoundField(
    "Stuff",
    buildSchema<DisabledStuff>({
      type: withScalarOptions(
        { isTypeField: true },
        stringOptionsField("Type", { name: "Some", value: "some" }),
      ),
      disable: boolField("Disable", {
        onlyForTypes: ["some"],
        tags: [SchemaTags.ControlGroup + "Root"],
      }),
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
  nested: compoundField(
    "Nested",
    buildSchema<NestedSchema>({
      data: stringField("Data", { tags: [SchemaTags.ControlGroup + "Root"] }),
    }),
  ),
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

const TabSchema = buildSchema<TabSchema>({
  value1: stringField("Value 1"),
  value2: stringField("Value 2"),
});

const TabControls = groupedControl(
  [dataControl("value1"), dataControl("value2")],
  "Tabs",
  { groupOptions: { type: GroupRenderType.Tabs } },
);

const schemaLookup = createSchemaLookup({
  TestSchema,
  GridSchema,
  RequestSchema,
  ResultSchema,
  ControlDefinitionSchema,
  TabSchema,
  ...SchemaMap,
});

export default function Editor() {
  const carClient = useApiClient(CarClient);
  const qc = useQueryControl();
  const roles = useControl<string[]>([]);
  const rolesSelectable = useSelectableArray(
    roles,
    ensureSelectableValues(["Student", "Teacher"], (x) => x),
  );
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const selectedForm = useSyncParam(
    qc,
    "form",
    convertStringParam(
      (x) => x,
      (x) => x,
      "EditorControls",
    ),
  );
  const StdFormRenderer = useMemo(
    () => createStdFormRenderer(container),
    [container],
  );
  const evalHook = useMemo(() => makeEvalExpressionHook(evalExpr), [roles]);
  if (!qc.fields.isReady.value) return <></>;
  return (
    <DndProvider backend={HTML5Backend}>
      <div id="dialog_container" ref={setContainer} />
      <BasicFormEditor<string>
        formRenderer={StdFormRenderer}
        schemas={schemaLookup}
        // handleIcon={<div>WOAH</div>}
        loadForm={async (c) => {
          if (c in FormDefinitions)
            return FormDefinitions[c as keyof typeof FormDefinitions];
          switch (c) {
            case "EditorControls":
              return {
                schemaName: "ControlDefinitionSchema",
                controls: controlsJson,
              };
            case "TabSchema":
              return { schemaName: c, controls: [TabControls] };
            default:
              return { schemaName: c, controls: [] };
          }
        }}
        selectedForm={selectedForm}
        formTypes={[
          ["EditorControls", "EditorControls"],
          ["CarInfo", "Pdf test"],
          ["TestSchema", "Test"],
          ["GridSchema", "Grid"],
          ["TabSchema", "Tabs"],
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
        extensions={Extensions}
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
