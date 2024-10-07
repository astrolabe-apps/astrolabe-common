"use client";

import { useControl } from "@react-typed-forms/core";
import {
  buildSchema,
  compoundField,
  createSchemaLookup,
  dataControl,
  DataRenderType,
  dynamicVisibility,
  groupedControl,
  jsonataExpr,
  makeSchemaDataNode,
  stringField,
  stringOptionsField,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import { createStdFormRenderer } from "../../renderers";

interface TestSchema {
  selected: string;
  selectables: Selectable[];
}

interface Selectable {
  id: string;
  name: string;
}

const TestSchema = buildSchema<TestSchema>({
  selected: stringOptionsField(
    "All",
    { value: "choice1", name: "Choice1" },
    { value: "choice2", name: "Choice2" },
  ),
  selectables: compoundField(
    "Selectables",
    buildSchema<Selectable>({
      id: stringField("id"),
      name: stringField("name"),
    }),
    { collection: true },
  ),
});

const renderer = createStdFormRenderer(null);
const schemaLookup = createSchemaLookup({ TestSchema });
const schemaNode = schemaLookup.getSchema("TestSchema")!;
const selectable = groupedControl([
  dataControl("selected", undefined, {
    renderOptions: { type: DataRenderType.Radio },
    children: [
      dataControl("selectables", "Selectables", {
        readonly: true,
        hideTitle: true,
        dynamic: [dynamicVisibility(jsonataExpr("$formData.optionSelected"))],
        children: [
          dataControl("name", null, {
            renderOptions: { type: DataRenderType.DisplayOnly },
            readonly: true,
            dynamic: [
              dynamicVisibility(jsonataExpr("$formData.option.value = id")),
            ],
          }),
        ],
      }),
    ],
  }),
]);

export default function CheckAdorn() {
  const pageControl = useControl<TestSchema>({
    selected: "",
    selectables: [
      { id: "choice1", name: "ONNNNEEE" },
      { id: "choice2", name: "TWO" },
    ],
  });
  const Render = useControlRendererComponent(
    selectable,
    renderer,
    {},
    makeSchemaDataNode(schemaNode, pageControl),
  );
  return (
    <div>
      <Render />
    </div>
  );
}
