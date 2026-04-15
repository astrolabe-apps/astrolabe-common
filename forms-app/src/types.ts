import { Control } from "@react-typed-forms/core";
import {
  ControlActionContext,
  ControlActionHandler,
  ControlDefinition,
  FieldOption,
  FormRenderer,
  RendererRegistration,
  SchemaField,
} from "@react-typed-forms/schemas";
import { ComponentType, ReactElement, ReactNode } from "react";

// --- Item types (matching Astrolabe.Forms/FormsDataTypes.cs) ---

/**
 * Full item detail for view/edit pages.
 */
export interface ItemViewData {
  actions: string[];
  formType: string;
  metadata: any;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  events?: ItemEventData[] | null;
  notes?: ItemNoteResultData[] | null;
}

/**
 * Audit event on an item.
 */
export interface ItemEventData {
  eventType: string;
  timestamp: string;
  message: string;
  personName: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
}

/**
 * Note displayed on an item.
 */
export interface ItemNoteResultData {
  message: string;
  personName: string | null;
  timestamp: string;
}

/**
 * Note submission payload.
 */
export interface ItemNoteEditData {
  message: string;
  internal: boolean;
}

/**
 * Item edit payload (metadata + optional workflow action).
 */
export interface ItemEditData {
  action: string | null;
  metadata: any;
}

// --- Form types ---

/**
 * Form + schemas returned from API for dynamic rendering.
 */
export interface FormRenderData {
  controls: ControlDefinition[];
  layoutMode: FormLayoutMode;
  navigationStyle: PageNavigationStyle;
  schemaName: string;
  schemas: Record<string, SchemaField[]>;
}

/**
 * Form layout configuration.
 */
export interface FormConfigData {
  layoutMode: FormLayoutMode;
  navigationStyle: PageNavigationStyle;
  public: boolean;
  published: boolean;
}

/**
 * Form info for listing.
 */
export interface NameIdData {
  id: string;
  name: string;
}

/**
 * Form definition for creation/editing.
 */
export interface FormDefinitionEditData {
  name: string;
  tableId: string | null;
  controls: ControlDefinition[];
  layoutMode: FormLayoutMode;
  navigationStyle: PageNavigationStyle;
  public: boolean;
  published: boolean;
}

/**
 * File upload result.
 */
export interface FormUploadData {
  id: string;
  filename: string;
  length: number;
}

// --- Table types ---

/**
 * Table definition for creation/editing.
 */
export interface TableDefinitionEditData {
  name: string | null;
  nameField: string | null;
  fields: SchemaField[];
  tags: string[];
}

// --- Export types ---

/**
 * Export definition for creation/editing.
 */
export interface ExportDefinitionEditData {
  tableDefinitionId: string;
  name: string;
  exportColumns: ExportColumnData[];
}

/**
 * Export column mapping.
 */
export interface ExportColumnData {
  field: string;
  columnName: string;
  expression: string | null;
}

// --- String constants (matching Astrolabe.Forms) ---

export const WorkflowActions = {
  Submit: "Submit",
  Approve: "Approve",
  Reject: "Reject",
  Export: "Export",
  ForceReindex: "ForceReindex",
} as const;

export const WorkflowStatuses = {
  NotStarted: "NotStarted",
  Draft: "Draft",
  Submitted: "Submitted",
  Approved: "Approved",
  Rejected: "Rejected",
} as const;

export const AuditEventTypes = {
  FormEdited: "FormEdited",
  StatusChange: "StatusChange",
  Note: "Note",
  ExportForm: "ExportForm",
} as const;

export enum FormLayoutMode {
  SinglePage = "SinglePage",
  MultiPage = "MultiPage",
}

export enum PageNavigationStyle {
  Wizard = "Wizard",
  Stepper = "Stepper",
  Tabs = "Tabs",
}

// --- File operations (injected by consumer) ---

/**
 * File operations for dynamic form rendering.
 * Consumer provides implementations backed by their API client.
 */
export interface FileOperations {
  downloadFile: (file: { id: string }) => Promise<void>;
  uploadFile: (file: File) => Promise<FormUploadData>;
  deleteFile: (file: { id: string }) => Promise<void>;
}

// --- Existing types below ---

/**
 * Generic search options matching the SearchOptions DTO pattern.
 */
export interface SearchOptions {
  offset: number;
  length: number;
  query: string | null;
  sort: string[] | null;
  filters: any | null;
}

/**
 * Generic item info for dashboard display.
 */
export interface ItemInfo {
  id: string;
  firstName: string;
  lastName: string;
  createdOn: string;
  status: string;
  formType: string;
  submittedOn: string | null;
}

/**
 * Search results with optional total count.
 */
export interface ItemSearchResults {
  total: number | null;
  entries: ItemInfo[];
}

// --- Dashboard / page composition types ---

/**
 * Dashboard data for the public item list (with create dialog).
 */
export interface ItemDashboardData {
  request: SearchOptions;
  results: ItemSearchResults | null;
  createType: string | null;
}

/**
 * Dashboard data for the admin item list.
 */
export interface AdminItemDashboardData {
  request: SearchOptions;
  results: ItemSearchResults | null;
}

/**
 * Export definition info shown in the dashboard.
 */
export interface ExportDefinitionDashboardInfoData {
  id: string;
  name: string;
  tableDefinitionName: string;
  tableDefinitionId: string;
}

/**
 * Dashboard data for export definitions.
 */
export interface ExportDefinitionDashboardData {
  request: SearchOptions;
  definitionInfos: ExportDefinitionDashboardInfoData[] | null;
}

/**
 * Export definition selection entry.
 */
export interface ExportDefinitionSelectionData {
  tableDefinitionName: string | null;
  tableDefinitionId: string;
  exportDefinitionId?: string | null;
}

/**
 * Collection of export definition selections.
 */
export interface ExportDefinitionSelectionsData {
  exportDefinitions: ExportDefinitionSelectionData[];
}

/**
 * Table definition selection form data.
 */
export interface TableDefinitionSelectionData {
  tableDefinitionId: string;
}

/**
 * File data returned from export operations.
 */
export interface FileData {
  data: Blob;
  fileName?: string;
}

/**
 * Export definition info within a group.
 */
export interface ExportDefinitionInfo {
  id: string;
  name: string;
}

/**
 * Group of export definitions for a table definition.
 */
export interface ExportDefinitionGroupData {
  infos: ExportDefinitionInfo[];
  tableDefinitionName: string;
  tableDefinitionId: string;
}

/**
 * Request body for getting export definitions.
 */
export interface ExportRecordsDefinitionData {
  recordIds: string[] | null;
  all: SearchOptions | null;
}

/**
 * Request body for performing an export.
 */
export interface ExportRecordRequest {
  recordIds: string[] | null;
  definitionId: string | null;
  all: SearchOptions | null;
}

/**
 * Flat API interface that consumers implement to adapt their NSwag clients.
 */
export interface DashboardPageApi {
  searchItems(
    includeTotal: boolean,
    request: SearchOptions,
  ): Promise<ItemSearchResults>;
  getFilterOptions(): Promise<Record<string, FieldOption[]>>;
  deleteItem(id: string): Promise<void>;
  getExportDefinitions(
    edit: ExportRecordsDefinitionData,
  ): Promise<ExportDefinitionGroupData[]>;
  exportRecord(edit: ExportRecordRequest): Promise<FileData>;
  goToViewItem(itemId: string): void;
  goToEditItem(itemId: string): void;
}

/**
 * A form definition entry mapping a form type to its schema and controls.
 */
export interface FormDefinitionEntry {
  value: string;
  name: string;
  schema: SchemaField[];
  schemaName: string;
  defaultConfig: string;
  controls: ControlDefinition[];
  config: any;
}

/**
 * Registry of form definitions keyed by form type name.
 */
export type FormDefinitionRegistry = Record<string, FormDefinitionEntry>;

/**
 * Registry of schemas keyed by schema name.
 */
export type SchemaRegistry = Record<string, SchemaField[]>;

/**
 * Configuration for creating a form renderer.
 */
export interface RendererConfig {
  createRenderer: (customRenderers: RendererRegistration[]) => FormRenderer;
}

/**
 * Props for the dialog component returned by useDialog.
 * Index signature ensures compatibility with UI-library dialog props
 * (e.g. SimpleDialogProps which extends HTMLAttributes).
 */
export interface FormsAppDialogProps {
  title: string;
  onCancel?: () => void;
  children: ReactNode;
  actions: ReactNode;
}

/**
 * Data passed to the confirm dialog open function.
 * Index signature ensures compatibility with UI-library confirm data types.
 */
export interface FormsAppConfirmData {
  title: string;
  action: () => void;
  children: ReactNode;
}

/**
 * UI component primitives that the forms-app library needs.
 * Consumers provide their own implementations (e.g. from @astrolabe/ui).
 */
export interface FormsAppUIComponents {
  useDialog: () => [
    (open: boolean) => void,
    (props: FormsAppDialogProps) => ReactNode,
  ];
  useConfirmDialog: () => [(props: FormsAppConfirmData) => void, ReactElement];
  Button: (props: {
    disabled?: boolean;
    onClick?: () => void;
    children?: ReactNode;
  }) => ReactNode;
  Textfield: ComponentType<{
    control: Control<string | null | undefined>;
    label: string;
    inputClass?: string;
  }>;
  CircularProgress: () => ReactNode;
}

export type ActionHandler<A> = (
  a: A,
  ctx: ControlActionContext,
) => void | Promise<any>;

export function makeActions<A extends Record<string, ActionHandler<any>>>(
  handlerMap: A,
): ControlActionHandler {
  return (actionId, actionData) => {
    const h = handlerMap[actionId];
    if (h) return (ctx: ControlActionContext) => h(actionData, ctx);
    return undefined;
  };
}
