import {
  FireRegistrationEditSchema,
  InitialFireRegistrationSchema,
} from "./schemas";
import { ControlDefinition } from "@react-typed-forms/schemas";
import BurnJson from "./formDefs/Burn.json";
import FireInitialJson from "./formDefs/FireInitial.json";

export const Burn = {
  value: "Burn",
  name: "Burn Registration",
  schema: FireRegistrationEditSchema,
  schemaName: "FireRegistrationEdit",
  defaultConfig: null,
  controls: BurnJson.controls as ControlDefinition[],
  config: BurnJson.config,
};

export const FireInitial = {
  value: "Fire Initial",
  name: "Fire Initial",
  schema: InitialFireRegistrationSchema,
  schemaName: "InitialFireRegistration",
  defaultConfig: null,
  controls: FireInitialJson.controls as ControlDefinition[],
  config: FireInitialJson.config,
};

export const FormDefinitions = {
  Burn: Burn,
  FireInitial: FireInitial,
};
