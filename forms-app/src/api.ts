import {
  ExportDefinitionEditData,
  ExportDefinitionGroupData,
  FormDefinitionEditData,
  FormInfoData,
  FormRenderData,
  ItemEditData,
  ItemNoteEditData,
  ItemViewData,
  ScopedNameIdData,
  TableDefinitionEditData,
} from "./types";

/**
 * API for the item view page.
 */
export interface ItemViewApi {
  getItemView(id: string): Promise<ItemViewData>;
  performAction(id: string, action: string): Promise<void>;
  addItemNote(id: string, note: ItemNoteEditData): Promise<void>;
  getFormForRender(formId: string): Promise<FormRenderData>;
}

/**
 * API for the item edit page.
 */
export interface ItemEditApi {
  getItemView(id: string): Promise<ItemViewData>;
  editItem(id: string, edit: ItemEditData): Promise<void>;
  getFormForRender(formId: string): Promise<FormRenderData>;
}

/**
 * API for the export dashboard page.
 */
export interface ExportDashboardApi {
  listExportDefinitions(): Promise<ExportDefinitionGroupData[]>;
  deleteExportDefinition(id: string): Promise<void>;
}

/**
 * API for the export edit page.
 */
export interface ExportEditApi {
  getExportDefinition(id: string): Promise<ExportDefinitionEditData>;
  saveExportDefinition(edit: ExportDefinitionEditData): Promise<void>;
  listTables(): Promise<ScopedNameIdData[]>;
  getTable(id: string): Promise<TableDefinitionEditData>;
}

/**
 * API for the forms editor page.
 */
export interface FormsEditorApi {
  listForms(
    forPublic?: boolean,
    published?: boolean,
  ): Promise<FormInfoData[]>;
  createForm(form: FormDefinitionEditData): Promise<string>;
  getForm(formId: string): Promise<FormDefinitionEditData>;
  editForm(formId: string, form: FormDefinitionEditData): Promise<void>;
  deleteForm(formId: string): Promise<void>;
  createTable(table: TableDefinitionEditData): Promise<string>;
  getTable(tableId: string): Promise<TableDefinitionEditData>;
  editTable(
    tableId: string,
    table: TableDefinitionEditData,
  ): Promise<void>;
  deleteTable(tableId: string): Promise<void>;
}
