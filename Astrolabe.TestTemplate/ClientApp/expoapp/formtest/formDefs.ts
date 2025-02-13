import { FireRegistrationEditSchema } from "./schemas";
import { ControlDefinition } from "@react-typed-forms/schemas";
import BurnJson from "./formDefs/Burn.json";

export const Burn = {
  value: "Burn",
  name: "Burn Registration",
  schema: FireRegistrationEditSchema,
  schemaName: "FireRegistrationEdit",
  defaultConfig: null,
  controls: BurnJson.controls as ControlDefinition[],
  config: BurnJson.config,
};

export const FormDefinitions = {
  Burn: Burn,
};
