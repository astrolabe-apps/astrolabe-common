"use client";

import { useApiClient } from "@astroapps/client/hooks/useApiClient";
import { CarClient, CarEdit, CarInfo } from "../../client";
import { useEffect, useMemo } from "react";
import {
  Control,
  RenderArrayElements,
  useControl,
} from "@react-typed-forms/core";
import {
  boolField,
  buildSchema,
  compoundField,
  ControlRenderer,
  createSchemaLookup,
  dataControl,
  DataRenderType,
  DefaultSchemaInterface,
  doubleField,
  dynamicVisibility,
  groupedControl,
  intField,
  jsonataExpr,
  makeSchemaDataNode,
  SchemaDataNode,
  SchemaNode,
  stringField,
  stringOptionsField,
  useControlRendererComponent,
  withScalarOptions,
} from "@react-typed-forms/schemas";
import { FormDefinitions } from "../../forms";
import {
  CarSearchPageForm,
  defaultCarSearchPageForm,
  SchemaMap,
} from "../../schemas";
import { createStdFormRenderer } from "../../renderers";
import { useClientSearching } from "@astroapps/schemas-datagrid";
import { SearchOptions } from "@astroapps/searchstate";
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
