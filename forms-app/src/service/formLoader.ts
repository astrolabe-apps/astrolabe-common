import {
  FormDefinitionEditData,
  FormRenderData,
  TableDefinitionEditData,
} from "../types";
import { AppContext } from "@astroapps/client";
import { useContext, useMemo } from "react";

/**
 * Minimal API surface needed to load form definitions and their schemas.
 * Consumers implement this by delegating to their NSwag-generated clients.
 */
export interface FormLoaderApi {
  getForm(formId: string): Promise<FormDefinitionEditData>;
  getTable(tableId: string): Promise<TableDefinitionEditData>;
}

export interface FormLoaderContext {
  formLoader: FormLoaderService;
}

export interface FormLoaderService {
  getFormRenderData(formDefinitionId: string): Promise<FormRenderData>;
  invalidateForm(formDefinitionId: string): void;
  invalidateTable(tableId: string): void;
}

export function useFormLoader(): FormLoaderService {
  const fl = useContext(AppContext).formLoader;
  if (!fl) throw new Error("FormLoaderService not available");
  return fl;
}

export function useFormLoaderService(api: FormLoaderApi): FormLoaderService {
  return useMemo(() => {
    return new FormLoaderServiceImpl(api);
  }, [api]);
}
/**
 * Loads and caches form render data (controls + schema) by form definition ID.
 * Table schemas are also cached independently so forms sharing a table don't re-fetch.
 */
class FormLoaderServiceImpl implements FormLoaderService {
  private formCache = new Map<string, Promise<FormRenderData>>();
  private tableCache = new Map<string, Promise<TableDefinitionEditData>>();

  constructor(private api: FormLoaderApi) {}

  /**
   * Returns the full render data for a form definition, fetching and caching as needed.
   */
  getFormRenderData(formDefinitionId: string): Promise<FormRenderData> {
    let cached = this.formCache.get(formDefinitionId);
    if (!cached) {
      cached = this.loadForm(formDefinitionId);
      this.formCache.set(formDefinitionId, cached);
    }
    return cached;
  }

  /**
   * Invalidate a cached form definition (e.g. after editing it).
   */
  invalidateForm(formDefinitionId: string) {
    this.formCache.delete(formDefinitionId);
  }

  /**
   * Invalidate a cached table schema.
   */
  invalidateTable(tableId: string) {
    this.tableCache.delete(tableId);
    // Also invalidate any forms that might reference this table
    this.formCache.clear();
  }

  private async loadForm(formDefinitionId: string): Promise<FormRenderData> {
    const form = await this.api.getForm(formDefinitionId);
    const tableId = form.tableId;
    if (!tableId) {
      throw new Error(
        `Form definition ${formDefinitionId} has no table assigned`,
      );
    }
    const table = await this.getTable(tableId);
    const schemaName = table.name ?? tableId;
    return {
      controls: form.controls,
      layoutMode: form.layoutMode,
      navigationStyle: form.navigationStyle,
      schemaName,
      schemas: { [schemaName]: table.fields },
    };
  }

  private getTable(tableId: string): Promise<TableDefinitionEditData> {
    let cached = this.tableCache.get(tableId);
    if (!cached) {
      cached = this.api.getTable(tableId);
      this.tableCache.set(tableId, cached);
    }
    return cached;
  }
}
