import { ControlDefinitionExtension } from "@react-typed-forms/schemas";
import { DataGridDefinition } from "./DataGridControlRenderer";
import { DataGridGroupDefinition } from "./DataGridGroup";
import { DataGridAdornmentDefinition } from "./columnAdornment";

export const DataGridExtension: ControlDefinitionExtension = {
  RenderOptions: DataGridDefinition,
  ControlAdornment: DataGridAdornmentDefinition,
  GroupRenderOptions: DataGridGroupDefinition,
};
