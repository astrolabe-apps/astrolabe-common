import { useContext, useMemo } from "react";
import {
  createFormLookup,
  createSchemaLookup,
  FormTreeLookup,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import {
  FormsAppUIComponents,
  FormDefinitionRegistry,
  SchemaRegistry,
  RendererConfig,
} from "../types";
import { DefaultFormDefinitions } from "../formdefs";
import { DefaultSchemaMap } from "../schemas";
import { AppContext } from "@astroapps/client";

export interface FormsAppService {
  ui: FormsAppUIComponents;
  formDefinitions: FormDefinitionRegistry;
  schemaMap: SchemaRegistry;
  formLookup: FormTreeLookup;
  schemaLookup: SchemaTreeLookup;
  rendererConfig: RendererConfig;
}

export interface FormsAppContext {
  formsApp: FormsAppService;
}

export interface FormsAppConfig {
  ui: FormsAppUIComponents;
  formDefinitions?: FormDefinitionRegistry;
  schemaMap?: SchemaRegistry;
  rendererConfig: RendererConfig;
}

export function createFormsAppService(config: FormsAppConfig): FormsAppService {
  const formDefinitions = config.formDefinitions ?? DefaultFormDefinitions;
  const schemaMap = config.schemaMap ?? DefaultSchemaMap;
  const formLookup = createFormLookup(
    Object.fromEntries(
      Object.entries(formDefinitions).map(([k, v]) => [k, v.controls]),
    ),
  );
  const schemaLookup = createSchemaLookup(schemaMap);
  return {
    ...config,
    formDefinitions,
    schemaMap,
    formLookup,
    schemaLookup,
  };
}

export function useFormsAppService(config: FormsAppConfig): FormsAppService {
  return useMemo(
    () => createFormsAppService(config),
    [config.formDefinitions, config.schemaMap, config.ui, config.rendererConfig],
  );
}

export function useFormsApp(): FormsAppService {
  const ctx = useContext(AppContext).formsApp;
  if (!ctx) {
    throw new Error("FormsAppService not available in AppContext");
  }
  return ctx;
}
