"use client";

import "flexlayout-react/style/light.css";
import { saveAs } from "file-saver";
import {
  BasicFormEditor,
  ControlDefinitionSchema,
  FieldSelectionExtension,
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
  createSchemaLookup,
  dataControl,
  dateField,
  dateTimeField,
  defaultEvalHooks,
  doubleField,
  EntityExpression,
  ExpressionType,
  FormNode,
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
import {
  OptStringParam,
  useApiClient,
  useQueryControl,
  useSyncParam,
} from "@astroapps/client";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import {
  CarClient,
  CarEdit,
  CodeGenClient,
  ControlDefinition as CD,
  SearchStateClient,
} from "../client";
import controlsJson from "../ControlDefinition.json";
import testSchemaControls from "../forms/TestSchema.json";
import { useMemo, useState } from "react";
import { DataGridExtension, PagerExtension } from "@astroapps/schemas-datagrid";
import { FormDefinitions } from "../forms";
import { createStdFormRenderer } from "../renderers";
import { QuickstreamExtension } from "@astroapps/schemas-quickstream";
import { SchemaMap } from "../schemas";
import { Button } from "@astrolabe/ui/Button";
import { Snippet } from "../../../../../../astrolabe-schemas-editor/src/views";

const Extensions = [
  DataGridExtension,
  QuickstreamExtension,
  PagerExtension,
  FieldSelectionExtension,
];

interface TabSchema {
  value1: string;
  value2: string;
}

interface DisabledStuff {
  type: string;
  disable: boolean;
  text: string;
  options: string[];
  singleOption: string;
}

interface NestedSchema {
  data: string;
}
interface TestSchema {
  date: string;
  dateTime: string;
  time: string;
  array: number[];
  bool: boolean;
  stuff: DisabledStuff[];
  number: number;
  nested: NestedSchema;
}

const TestSchema = buildSchema<TestSchema>({
  date: dateField("Date"),
  dateTime: dateTimeField("Date Time"),
  time: timeField("Time", { tags: [SchemaTags.ControlGroup + "Nested"] }),
  array: intField("Numbers", { collection: true }),
  bool: boolField("Bool"),
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
          {
            name: "The Shawshank Redemption",
            value: "The Shawshank Redemption",
            group: "Drama",
          },
          { name: "The Godfather", value: "The Godfather", group: "Crime" },
          {
            name: "The Dark Knight",
            value: "The Dark Knight",
            group: "Action",
          },
          { name: "12 Angry Men", value: "12 Angry Men", group: "Drama" },
          {
            name: "Schindler's List",
            value: "Schindler's List",
            group: "Biography",
          },
          {
            name: "The Lord of the Rings: The Return of the King",
            value: "The Lord of the Rings: The Return of the King",
            group: "Adventure",
          },
          { name: "Pulp Fiction", value: "Pulp Fiction", group: "Crime" },
          {
            name: "The Good, the Bad and the Ugly",
            value: "The Good, the Bad and the Ugly",
            group: "Western",
          },
          { name: "Fight Club", value: "Fight Club", group: "Drama" },
          { name: "Forrest Gump", value: "Forrest Gump", group: "Drama" },
          { name: "Inception", value: "Inception", group: "Action" },
          { name: "The Matrix", value: "The Matrix", group: "Sci-Fi" },
          { name: "Goodfellas", value: "Goodfellas", group: "Biography" },
          {
            name: "The Empire Strikes Back",
            value: "The Empire Strikes Back",
            group: "Adventure",
          },
          {
            name: "One Flew Over the Cuckoo's Nest",
            value: "One Flew Over the Cuckoo's Nest",
            group: "Drama",
          },
          { name: "Interstellar", value: "Interstellar", group: "Adventure" },
          { name: "City of God", value: "City of God", group: "Crime" },
          { name: "Se7en", value: "Se7en", group: "Crime" },
          {
            name: "The Silence of the Lambs",
            value: "The Silence of the Lambs",
            group: "Thriller",
          },
          {
            name: "It's a Wonderful Life",
            value: "It's a Wonderful Life",
            group: "Drama",
          },
          {
            name: "Life Is Beautiful",
            value: "Life Is Beautiful",
            group: "Comedy",
          },
          {
            name: "The Usual Suspects",
            value: "The Usual Suspects",
            group: "Crime",
          },
          {
            name: "Léon: The Professional",
            value: "Léon: The Professional",
            group: "Crime",
          },
          {
            name: "Saving Private Ryan",
            value: "Saving Private Ryan",
            group: "Drama",
          },
          { name: "Spirited Away", value: "Spirited Away", group: "Animation" },
          { name: "The Green Mile", value: "The Green Mile", group: "Crime" },
          { name: "Parasite", value: "Parasite", group: "Thriller" },
          { name: "The Pianist", value: "The Pianist", group: "Biography" },
          { name: "Gladiator", value: "Gladiator", group: "Action" },
          { name: "The Lion King", value: "The Lion King", group: "Animation" },
        ),
      ),
      singleOption: stringOptionsField(
        "String",
        { name: "One", value: "1" },
        { name: "Two", value: "2" },
        { name: "Three", value: "3" },
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
  const selectedForm = useSyncParam(qc, "form", OptStringParam);
  const StdFormRenderer = useMemo(
    () => createStdFormRenderer(container),
    [container],
  );
  const evalHook = useMemo(() => makeEvalExpressionHook(evalExpr), [roles]);
  if (!qc.fields.isReady.value) return <></>;
  return (
    <DndProvider backend={HTML5Backend}>
      <div id="dialog_container" ref={setContainer} />
      <BasicFormEditor
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
            case "TestSchema":
              return { schemaName: c, controls: testSchemaControls.controls };
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
                selectedForm.value!,
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
        snippets={testSnippet}
      />
    </DndProvider>
  );

  async function genPdf(c: FormNode, data: Control<any>) {
    const file = await carClient.generatePdf({
      controls: c.definition.children! as CD[],
      schemaName: selectedForm.value!,
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

const testSnippet = [
  {
    id: "container",
    name: "Container",
    definition: {
      type: "Group",
      title: "Container",
      styleClass: "flex flex-col border border-black p-4",
      children: [
        {
          type: "Display",
          title: "Title",
          displayData: {
            type: "Text",
            text: "Title",
          },
        },
        {
          type: "Display",
          title: "Content",
          displayData: {
            type: "Text",
            text: "Content",
          },
        },
      ],
      groupOptions: {
        type: "Standard",
      },
    },
  },
  {
    id: "badge",
    name: "Badge",
    group: "Badges",
    definition: {
      type: "Group",
      title: "Badge",
      styleClass: "bg-primary-500 w-fit px-2 py-1",
      children: [
        {
          type: "Display",
          title: "Title",
          styleClass: "text-white",
          displayData: {
            type: "Text",
            text: "Badge Title",
          },
        },
      ],
      groupOptions: {
        type: "Standard",
        hideTitle: true,
      },
    },
  },
] as unknown as Snippet[];
