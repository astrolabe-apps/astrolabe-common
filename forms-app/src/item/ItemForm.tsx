import {
  ControlDefinition,
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  FormRenderer,
  RendererRegistration,
  RenderForm,
  SchemaField,
} from "@react-typed-forms/schemas";
import { FormLayoutMode, PageNavigationStyle } from "../types";
import { useMemo } from "react";
import {
  createActionWizardNavigation,
  createWorkflowActions,
  wrapFormControls,
} from "./workflowActions";
import { Control } from "@react-typed-forms/core";

export interface ItemFormProps {
  itemActions: Control<string[]>;
  controls: ControlDefinition[];
  schemaName: string;
  schemas: Record<string, SchemaField[]>;
  layoutMode: FormLayoutMode;
  navigationStyle: PageNavigationStyle;
  createRenderer: (r: RendererRegistration[]) => FormRenderer;
  data: Control<unknown>;
}

export function ItemForm({
  controls,
  itemActions,
  layoutMode,
  navigationStyle,
  createRenderer,
  schemaName,
  schemas,
  data,
}: ItemFormProps) {
  const [formTree, schemaLookup, renderer] = useMemo(() => {
    const wizardRenderer = createActionWizardNavigation(
      createWorkflowActions(
        itemActions,
        () => true,
        () => {},
      ),
    );
    return [
      createFormTree(wrapFormControls(controls, layoutMode, navigationStyle)),
      createSchemaLookup(schemas),
      createRenderer([wizardRenderer]),
    ];
  }, [controls, layoutMode, navigationStyle, schemas]);
  const dataNode = createSchemaDataNode(
    schemaLookup.getSchema(schemaName),
    data,
  );
  return (
    <RenderForm data={dataNode} form={formTree.rootNode} renderer={renderer} />
  );
}
