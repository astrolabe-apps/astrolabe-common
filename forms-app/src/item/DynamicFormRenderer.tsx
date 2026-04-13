import React, { useEffect, useMemo } from "react";
import { Control, RenderOptional, useControl } from "@react-typed-forms/core";
import {
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  FormTree,
  RendererRegistration,
  RenderForm,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import { FileOperations, FormRenderData } from "../types";
import { useFormsApp } from "../FormsAppProvider";
import { wrapFormControls } from "./workflowActions";

export interface DynamicFormRendererProps {
  formId: string;
  itemId?: string;
  formData: Control<any>;
  readonly?: boolean;
  customRenderers?: RendererRegistration[];
  noNavigation?: boolean;
  getFormForRender: (formId: string) => Promise<FormRenderData>;
  fileOperations?: FileOperations;
}

interface LoadedForm {
  formTree: FormTree;
  schemaName: string;
  schemas: SchemaTreeLookup;
}

/**
 * Dynamically loads a form definition from the API and renders it.
 * Replaces the app-specific ItemForm — no NSwag client dependencies.
 */
export function DynamicFormRenderer({
  formId,
  formData,
  readonly,
  customRenderers,
  noNavigation,
  getFormForRender,
  fileOperations,
}: DynamicFormRendererProps) {
  const formDef = useControl<LoadedForm>();

  useEffect(() => {
    loadForm(formId);
  }, [formId]);

  return (
    <RenderOptional
      control={formDef}
      children={(c) => (
        <LoadedFormRenderer
          form={c.value}
          formData={formData}
          readonly={readonly}
          customRenderers={customRenderers}
          fileOperations={fileOperations}
        />
      )}
    />
  );

  async function loadForm(formId: string) {
    const form = await getFormForRender(formId);
    const formTree = createFormTree(
      noNavigation
        ? form.controls
        : wrapFormControls(form.controls, form.config),
    );
    const schemas = createSchemaLookup(form.schemas);
    formDef.value = { formTree, schemas, schemaName: form.schemaName };
  }
}

function LoadedFormRenderer({
  form: { formTree, schemas, schemaName },
  formData,
  readonly,
  customRenderers,
  fileOperations,
}: {
  form: LoadedForm;
  formData: Control<any>;
  readonly?: boolean;
  customRenderers?: RendererRegistration[];
  fileOperations?: FileOperations;
}) {
  const { rendererConfig } = useFormsApp();

  const formRenderer = useMemo(() => {
    if (!rendererConfig) {
      throw new Error(
        "DynamicFormRenderer requires rendererConfig in FormsAppProvider",
      );
    }
    return rendererConfig.createRenderer([
      ...(customRenderers ?? []),
    ]);
  }, [rendererConfig, customRenderers]);

  return (
    <RenderForm
      form={formTree.rootNode}
      data={createSchemaDataNode(schemas.getSchema(schemaName)!, formData)}
      renderer={formRenderer}
      options={{ readonly }}
    />
  );
}
