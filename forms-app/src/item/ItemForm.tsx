import {
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  FormRenderer,
  FormTree,
  RendererRegistration,
  RenderForm,
  SchemaTree,
} from "@react-typed-forms/schemas";
import React, { useEffect, useMemo } from "react";
import {
  createActionWizardNavigation,
  createWorkflowActions,
  wrapFormControls,
} from "./workflowActions";
import { Control, RenderOptional, useControl } from "@react-typed-forms/core";
import { useFormLoader, useFormLoaderService } from "../service/formLoader";
import { CustomNavigationProps } from "@react-typed-forms/schemas-html";

export interface ItemFormProps {
  itemActions: Control<string[]>;
  data: Control<unknown>;
  formId: string;
  filterActions?: (action: string, navProps: CustomNavigationProps) => boolean;
  doAction: (action: string | null) => void;
  options?: { doCancel?: () => void; hideSave?: boolean };
  createRenderer: (r: RendererRegistration[]) => FormRenderer;
}

export function ItemForm({
  createRenderer,
  data,
  formId,
  itemActions,
  filterActions,
  doAction,
  options,
}: ItemFormProps) {
  const loadedForm = useLoadForm(formId);
  const renderer = useMemo(() => {
    const wizard = createActionWizardNavigation(
      createWorkflowActions(
        itemActions,
        filterActions ?? (() => true),
        doAction,
        options,
      ),
    );
    return createRenderer([wizard]);
  }, [itemActions]);

  return (
    <RenderOptional
      control={loadedForm}
      children={renderForm}
      notDefined={<div>Loading...</div>}
    />
  );

  function renderForm(formControl: Control<ResolvedForm>) {
    const form = formControl.value;
    const dataNode = createSchemaDataNode(form.schemaTree.rootNode, data);
    return (
      <RenderForm
        data={dataNode}
        form={form.formTree.rootNode}
        renderer={renderer}
      />
    );
  }
}

export interface ResolvedForm {
  formTree: FormTree;
  schemaTree: SchemaTree;
}

export function useLoadForm(formId: string): Control<ResolvedForm | undefined> {
  const loader = useFormLoader();
  const resolved = useControl<ResolvedForm>();
  useEffect(() => {
    loadForm(formId);
  }, [formId]);
  return resolved;

  async function loadForm(formId: string) {
    const { controls, layoutMode, navigationStyle, schemas, schemaName } =
      await loader.getFormRenderData(formId);
    const formTree = createFormTree(
      wrapFormControls(controls, layoutMode, navigationStyle),
    );
    const schemaTree = createSchemaLookup(schemas).getSchemaTree(schemaName);
    resolved.value = { formTree, schemaTree };
  }
}
