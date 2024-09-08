import { useControl } from "@react-typed-forms/core";
import {
  buildSchema,
  ControlRenderer,
  createDefaultRenderers,
  createFormRenderer,
  dataControl,
  doubleField,
  defaultTailwindTheme,
  stringField,
  intField,
  groupedControl,
  textDisplayControl,
  htmlDisplayControl,
  boolField,
  DataRenderType,
  timeField,
  AllowedSchema,
  dynamicVisibility,
  fieldEqExpr,
  dynamicDefaultValue,
  fieldExpr,
  dynamicReadonly,
  dynamicDisabled,
} from "@react-typed-forms/schemas";
import React from "react";
import { applyEditorExtensions } from "@astroapps/schemas-editor";
import { DataGridExtension } from "@astroapps/schemas-datagrid";

interface DynamicControls {
  visible: boolean;
  disabled: boolean;
  readonly: boolean;
  defaultValue: string;
  dynamic: string | null;
}

const Schema = buildSchema<DynamicControls>({
  disabled: boolField("Disabled"),
  readonly: boolField("Readonly"),
  defaultValue: stringField("DefaultValue"),
  visible: boolField("Visible"),
  dynamic: stringField("Dynamic"),
});

const CustomControlSchema = applyEditorExtensions(DataGridExtension);

const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

function checkControl(field: string) {
  return dataControl(field, null, {
    renderOptions: { type: DataRenderType.Checkbox },
  });
}

const allGroup = groupedControl([
  checkControl("visible"),
  checkControl("disabled"),
  checkControl("readonly"),
  dataControl("defaultValue", null, { styleClass: "defaultValue" }),
  // dataControl("dynamic", null, {
  //   dynamic: [dynamicVisibility(fieldExpr("visible"))],
  //   renderOptions: { type: DataRenderType.NullToggle },
  // }),
  dataControl("dynamic", null, {
    styleClass: "dynamicText",
    dynamic: [
      dynamicVisibility(fieldEqExpr("visible", true)),
      dynamicReadonly(fieldExpr("readonly")),
      dynamicDisabled(fieldExpr("disabled")),
      dynamicDefaultValue(fieldExpr("defaultValue")),
    ],
  }),
]);

export function DynamicControls() {
  const control = useControl<DynamicControls>({
    visible: false,
    disabled: false,
    defaultValue: "",
    readonly: false,
    dynamic: null,
  });
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