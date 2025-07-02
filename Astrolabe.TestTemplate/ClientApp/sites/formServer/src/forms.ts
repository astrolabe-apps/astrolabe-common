import { CarSearchPageSchema } from "./schemas";
import CarSearchJson from "./forms/CarSearch.json";
import { ControlDefinition, SchemaField } from "@react-typed-forms/schemas";

export const CarSearch = {
  value: "CarSearch",
  name: "Car Search Page",
  schema: CarSearchPageSchema,
  schemaName: "CarSearchPage",
  defaultConfig: null,
  controls: CarSearchJson.controls as ControlDefinition[],
  config: CarSearchJson.config,
  formFields: CarSearchJson.fields as SchemaField[],
};

export const FormDefinitions = {
  CarSearch: CarSearch,
};
