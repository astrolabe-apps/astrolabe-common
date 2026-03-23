import React, { createContext, ReactNode, useContext, useMemo } from "react";
import {
  createFormLookup,
  createSchemaLookup,
  FormTreeLookup,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import { NavigationHandler } from "./navigation";
import {
  FormsAppApi,
  FormsAppUIComponents,
  FormDefinitionRegistry,
  SchemaRegistry,
  RendererConfig,
} from "./types";
import { DefaultFormDefinitions } from "./formdefs";
import { DefaultSchemaMap } from "./schemas";

export interface FormsAppConfig {
  api: FormsAppApi;
  ui: FormsAppUIComponents;
  navigationHandler: NavigationHandler;
  formDefinitions?: FormDefinitionRegistry;
  schemaMap?: SchemaRegistry;
  rendererConfig: RendererConfig;
  submittedStatus?: string;
}

interface FormsAppContextValue extends FormsAppConfig {
  formDefinitions: FormDefinitionRegistry;
  schemaMap: SchemaRegistry;
  formLookup: FormTreeLookup;
  schemaLookup: SchemaTreeLookup;
}

const FormsAppContext = createContext<FormsAppContextValue | null>(null);

export function FormsAppProvider({
  config,
  children,
}: {
  config: FormsAppConfig;
  children: ReactNode;
}) {
  const value = useMemo<FormsAppContextValue>(() => {
    const formDefinitions =
      config.formDefinitions ?? DefaultFormDefinitions;
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
  }, [
    config.formDefinitions,
    config.schemaMap,
    config.api,
    config.ui,
    config.navigationHandler,
    config.rendererConfig,
    config.submittedStatus,
  ]);

  return (
    <FormsAppContext.Provider value={value}>
      {children}
    </FormsAppContext.Provider>
  );
}

export function useFormsApp(): FormsAppContextValue {
  const ctx = useContext(FormsAppContext);
  if (!ctx) {
    throw new Error("useFormsApp must be used within a FormsAppProvider");
  }
  return ctx;
}
