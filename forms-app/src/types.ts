import {
  ControlActionContext,
  ControlActionHandler,
  ControlDefinition,
  FieldOption,
  FormRenderer,
  RendererRegistration,
  SchemaField,
} from "@react-typed-forms/schemas";
import { ReactElement, ReactNode } from "react";

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
  status: string;
  [key: string]: any;
}

/**
 * Search results with optional total count.
 */
export interface ItemSearchResults {
  total: number | null;
  entries: ItemInfo[];
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
export interface FormsAppApi {
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
  createRenderer: (
    customRenderers?: RendererRegistration[],
  ) => FormRenderer;
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
  [key: string]: any;
}

/**
 * Data passed to the confirm dialog open function.
 * Index signature ensures compatibility with UI-library confirm data types.
 */
export interface FormsAppConfirmData {
  title: string;
  action: () => void;
  children: ReactNode;
  [key: string]: any;
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
  useConfirmDialog: () => [
    (props: FormsAppConfirmData) => void,
    ReactElement,
  ];
  Button: (props: {
    disabled?: boolean;
    onClick?: () => void;
    children?: ReactNode;
  }) => ReactNode;
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
