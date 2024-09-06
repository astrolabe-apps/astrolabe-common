"use client";

import {
  applyEditorExtensions,
  BasicFormEditor,
  ControlDefinitionSchema,
} from "@astroapps/schemas-editor";
import {
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
  createDefaultRenderers,
  createFormRenderer,
  defaultEvalHooks,
  defaultTailwindTheme,
  doubleField,
  EntityExpression,
  ExpressionType,
  intField,
  makeEvalExpressionHook,
  stringField,
  stringOptionsField,
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
import { Client } from "../client";
import controlsJson from "../ControlDefinition.json";
import { createDatePickerRenderer } from "@astroapps/schemas-datepicker";
import { useMemo, useState } from "react";
import {
  createDataGridRenderer,
  DataGridExtension,
} from "@astroapps/schemas-datagrid";

const CustomControlSchema = applyEditorExtensions(DataGridExtension);

function createStdFormRenderer(container: HTMLElement | null) {
  return createFormRenderer(
    [
      createDataGridRenderer({ addText: "Add", removeText: "Delete" }),
      createDatePickerRenderer(undefined, {
        portalContainer: container ? container : undefined,
      }),
    ],
    createDefaultRenderers({
      ...defaultTailwindTheme,
    }),
  );
}

interface DisabledStuff {
  disable: boolean;
  text: string;
  options: string[];
}
interface TestSchema {
  array: number[];
  stuff: DisabledStuff[];
  number: number;
}

const TestSchema = buildSchema<TestSchema>({
  array: intField("Numbers", { collection: true }),
  stuff: compoundField(
    "Stuff",
    buildSchema<DisabledStuff>({
      disable: boolField("Disable"),
      text: stringField("Pure Text"),
      options: withScalarOptions(
        { collection: true },
        stringOptionsField(
          "String",
          { name: "One", value: "one" },
          { name: "Two", value: "two" },
        ),
      ),
    }),
    { collection: true },
  ),
  number: doubleField("Double"),
});

export default function Editor() {
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
      "Test",
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
          useEvalExpressionHook: evalHook,
        }}
        controlDefinitionSchemaMap={CustomControlSchema}
        editorControls={controlsJson}
        extraPreviewControls={
          <div>
            <RenderElements control={rolesSelectable}>
              {(c) => (
                <div>
                  <Fcheckbox control={c.fields.selected} />{" "}
                  {c.fields.value.value}
                </div>
              )}
            </RenderElements>
          </div>
        }
      />
    </DndProvider>
  );

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
