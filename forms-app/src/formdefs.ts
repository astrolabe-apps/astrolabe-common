import { ControlDefinition, SchemaField } from "@react-typed-forms/schemas";
import {
  ItemDashboardSchema,
  AdminItemDashboardSchema,
  ExportDefinitionDashboardSchema,
  ExportDefinitionEditSchema,
  ExportDefinitionSelectionsSchema,
  TableDefinitionSelectionSchema,
  ItemViewSchema,
} from "./schemas";
import { FormDefinitionEntry, FormDefinitionRegistry } from "./types";
import ItemDashboardJson from "./forms/ItemDashboard.json";
import AdminItemDashboardJson from "./forms/AdminItemDashboard.json";
import ExportDefinitionDashboardJson from "./forms/ExportDefinitionDashboard.json";
import ExportDefinitionEditFormJson from "./forms/ExportDefinitionEditForm.json";
import ExportDefinitionSelectionsFormJson from "./forms/ExportDefinitionSelectionsForm.json";
import TableDefinitionSelectionFormJson from "./forms/TableDefinitionSelectionForm.json";
import AdminItemViewFormJson from "./forms/AdminItemViewForm.json";
import ItemViewFormJson from "./forms/ItemViewForm.json";

export const ItemDashboard: FormDefinitionEntry = {
  value: "ItemDashboard",
  name: "Item Dashboard",
  schema: ItemDashboardSchema,
  schemaName: "ItemDashboard",
  defaultConfig: "Dashboards",
  controls: ItemDashboardJson.controls as ControlDefinition[],
  config: ItemDashboardJson.config,
};

export const AdminItemDashboard: FormDefinitionEntry = {
  value: "AdminItemDashboard",
  name: "Admin Item Dashboard",
  schema: AdminItemDashboardSchema,
  schemaName: "AdminItemDashboard",
  defaultConfig: "Dashboards",
  controls: AdminItemDashboardJson.controls as ControlDefinition[],
  config: AdminItemDashboardJson.config,
};

export const ExportDefinitionDashboard: FormDefinitionEntry = {
  value: "ExportDefinitionDashboard",
  name: "Export Definition Dashboard",
  schema: ExportDefinitionDashboardSchema,
  schemaName: "ExportDefinitionDashboard",
  defaultConfig: "Dashboards",
  controls: ExportDefinitionDashboardJson.controls as ControlDefinition[],
  config: ExportDefinitionDashboardJson.config,
};

export const ExportDefinitionEditForm: FormDefinitionEntry = {
  value: "ExportDefinitionEditForm",
  name: "Export Definition Edit Form",
  schema: ExportDefinitionEditSchema,
  schemaName: "ExportDefinitionEdit",
  defaultConfig: "Form",
  controls: ExportDefinitionEditFormJson.controls as ControlDefinition[],
  config: ExportDefinitionEditFormJson.config,
};

export const ExportDefinitionSelectionsForm: FormDefinitionEntry = {
  value: "ExportDefinitionSelectionsForm",
  name: "Export Definition Selections Form",
  schema: ExportDefinitionSelectionsSchema,
  schemaName: "ExportDefinitionSelections",
  defaultConfig: "Form",
  controls: ExportDefinitionSelectionsFormJson.controls as ControlDefinition[],
  config: ExportDefinitionSelectionsFormJson.config,
};

export const TableDefinitionSelectionForm: FormDefinitionEntry = {
  value: "TableDefinitionSelectionForm",
  name: "Table Definition Selection Form",
  schema: TableDefinitionSelectionSchema,
  schemaName: "TableDefinitionSelection",
  defaultConfig: "Form",
  controls: TableDefinitionSelectionFormJson.controls as ControlDefinition[],
  config: TableDefinitionSelectionFormJson.config,
};

export const AdminItemViewForm: FormDefinitionEntry = {
  value: "AdminItemViewForm",
  name: "Admin Item View Form",
  schema: ItemViewSchema,
  schemaName: "ItemView",
  defaultConfig: "Form",
  controls: AdminItemViewFormJson.controls as ControlDefinition[],
  config: AdminItemViewFormJson.config,
};

export const ItemViewForm: FormDefinitionEntry = {
  value: "ItemViewForm",
  name: "Item View Form",
  schema: ItemViewSchema,
  schemaName: "ItemView",
  defaultConfig: "Form",
  controls: ItemViewFormJson.controls as ControlDefinition[],
  config: ItemViewFormJson.config,
};

export const DefaultFormDefinitions: FormDefinitionRegistry = {
  ItemDashboard,
  AdminItemDashboard,
  ExportDefinitionDashboard,
  ExportDefinitionEditForm,
  ExportDefinitionSelectionsForm,
  TableDefinitionSelectionForm,
  AdminItemViewForm,
  ItemViewForm,
};