import {
  ExportDefinitionEditData,
  ExportDefinitionGroupData,
  FormDefinitionEditData,
  NameIdData,
  TableDefinitionEditData,
} from "./types";

/**
 * API for the export dashboard page.
 */
export interface ExportDashboardApi {
  listExportDefinitions(): Promise<ExportDefinitionGroupData[]>;
  deleteExportDefinition(id: string): Promise<void>;
  goToCreateExport(): void;
  goToEditExport(definitionId: string): void;
}

/**
 * API for the export edit page.
 */
export interface ExportEditApi {
  getExportDefinition(id: string): Promise<ExportDefinitionEditData>;
  saveExportDefinition(edit: ExportDefinitionEditData): Promise<void>;
  listTables(): Promise<NameIdData[]>;
  getTable(id: string): Promise<TableDefinitionEditData>;
  goToExportDashboard(): void;
}

/**
 * API for the forms editor page.
 */
export interface FormsEditorApi {
  listForms(): Promise<NameIdData[]>;
  createForm(form: FormDefinitionEditData): Promise<string>;
  getForm(formId: string): Promise<FormDefinitionEditData>;
  editForm(formId: string, form: FormDefinitionEditData): Promise<void>;
  deleteForm(formId: string): Promise<void>;
  createTable(table: TableDefinitionEditData): Promise<string>;
  getTable(tableId: string): Promise<TableDefinitionEditData>;
  editTable(tableId: string, table: TableDefinitionEditData): Promise<void>;
  deleteTable(tableId: string): Promise<void>;
}
