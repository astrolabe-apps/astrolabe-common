import {
  createSchemaDataNode,
  FormRenderer,
  RendererRegistration,
  RenderForm,
} from "@react-typed-forms/schemas";
import { useMemo } from "react";
import {
  createActionWizardNavigation,
  createWorkflowActions,
} from "./workflowActions";
import { Control, RenderOptional } from "@react-typed-forms/core";
import { ResolvedForm, useLoadForm } from "../service/formLoader";

export interface ItemFormProps {
  itemActions: Control<string[]>;
  data: Control<unknown>;
  formId: string;
  createRenderer: (r: RendererRegistration[]) => FormRenderer;
}

export function ItemForm({
  itemActions,
  createRenderer,
  data,
  formId,
}: ItemFormProps) {
  const loadedForm = useLoadForm(formId);
  const renderer = useMemo(() => {
    const wizard = createActionWizardNavigation(
      createWorkflowActions(
        itemActions,
        () => true,
        () => {},
      ),
    );
    return createRenderer([wizard]);
  }, [itemActions]);

  return <RenderOptional control={loadedForm} children={renderForm} />;

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
