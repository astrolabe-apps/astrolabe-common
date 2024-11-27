import { CarSearchPageSchema } from "./schemas";
import CarSearchJson from "./forms/CarSearch.json";
import { ControlDefinition } from "@react-typed-forms/schemas";

export const CarSearch = {
  value: "CarSearch",
  name: "Car Search Page",
  schema: CarSearchPageSchema,
  schemaName: "CarSearchPage",
  defaultConfig: null,
  controls: CarSearchJson.controls as ControlDefinition[],
  config: CarSearchJson.config,
};

export const FormDefinitions = {
  CarSearch: CarSearch,
};
