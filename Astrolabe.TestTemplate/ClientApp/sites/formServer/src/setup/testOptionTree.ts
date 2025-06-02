import { createStdFormRenderer } from "../renderers";
import {
  accordionOptions,
  buildSchema,
  compoundField,
  createSchemaLookup,
  dataControl,
  DataRenderType,
  dynamicVisibility,
  groupedControl,
  jsonataExpr,
  stringField,
  stringOptionsField,
} from "@react-typed-forms/schemas";

export interface TestOptionSchema {
  selected: string;
  selectables: Selectable[];
}

interface Selectable {
  id: string;
  name: string;
}

export const TestSchema = buildSchema<TestOptionSchema>({
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

export const OptionForm = groupedControl([
  dataControl("selected", undefined, {
    renderOptions: { type: DataRenderType.Radio },
    adornments: [accordionOptions({ title: "Open" })],
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
