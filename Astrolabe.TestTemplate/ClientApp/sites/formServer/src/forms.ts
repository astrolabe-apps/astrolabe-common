import { CarSearchPageSchema, ChartsDemoSchema } from "./schemas";
import CarSearchJson from "./forms/CarSearch.json";
import ChartsDemoJson from "./forms/ChartsDemo.json";
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

export const ChartsDemo = {
  value: "ChartsDemo",
  name: "Charts Demo",
  schema: ChartsDemoSchema,
  schemaName: "ChartsDemo",
  defaultConfig: null,
  controls: ChartsDemoJson.controls as ControlDefinition[],
  config: ChartsDemoJson.config,
  formFields: ChartsDemoJson.fields as SchemaField[],
};

export const FormDefinitions = {
  CarSearch: CarSearch,
  ChartsDemo: ChartsDemo,
};
