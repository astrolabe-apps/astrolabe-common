import React, { useMemo } from "react";
import {
  ControlRenderOptions,
  createSchemaDataNode,
  DefaultSchemaInterface,
  FieldOption,
  getSchemaNodePathString,
  RendererRegistration,
  SchemaDataNode,
  SchemaNode,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";
import { useFormsApp } from "./FormsAppProvider";

export type DynamicFieldOptions = {
  pathOptions?: Record<string, Control<FieldOption[]>>;
};

export interface AppFormRendererProps {
  formType: string;
  control: Control<any>;
  dynamicFieldOptions?: DynamicFieldOptions;
  dynamicDataOptions?: (
    node: SchemaDataNode,
  ) => FieldOption[] | null | undefined;
  renderOptions?: ControlRenderOptions;
  customRenderers?: RendererRegistration[];
}

export function AppFormRenderer({
  formType,
  control,
  dynamicFieldOptions,
  renderOptions,
  customRenderers,
  dynamicDataOptions,
}: AppFormRendererProps) {
  const { formDefinitions, formLookup, schemaLookup, rendererConfig } =
    useFormsApp();

  if (!formDefinitions || !formLookup || !schemaLookup || !rendererConfig) {
    throw new Error(
      "AppFormRenderer requires formDefinitions, schemaMap, and rendererConfig in FormsAppProvider",
    );
  }

  const { schemaName } = formDefinitions[formType];
  const schemaInterface = useMemo(
    () => new DynamicOptionsSchemaInterface(),
    [],
  );

  const renderer = useMemo(() => {
    return rendererConfig.createRenderer(customRenderers);
  }, [customRenderers, rendererConfig]);

  schemaInterface.dynamicOptions = dynamicFieldOptions ?? {};
  schemaInterface.dynamicDataOptions = dynamicDataOptions;

  const Render = useControlRendererComponent(
    formLookup.getForm(formType)!.rootNode,
    renderer,
    { schemaInterface, ...renderOptions },
    createSchemaDataNode(
      schemaLookup.getSchemaTree(schemaName)!.rootNode,
      control,
    ),
  );

  return <Render />;
}

class DynamicOptionsSchemaInterface extends DefaultSchemaInterface {
  public dynamicOptions: DynamicFieldOptions = {};
  public dynamicDataOptions?: (
    node: SchemaDataNode,
  ) => FieldOption[] | null | undefined;

  constructor() {
    super();
  }

  getNodeOptions(node: SchemaNode): FieldOption[] | null | undefined {
    const path = getSchemaNodePathString(node);
    const fieldControl = this.dynamicOptions.pathOptions?.[path];
    if (fieldControl) {
      return fieldControl.value;
    }
    return super.getNodeOptions(node);
  }

  getDataOptions(node: SchemaDataNode): FieldOption[] | null | undefined {
    if (this.dynamicDataOptions) return this.dynamicDataOptions(node);
    return super.getDataOptions(node);
  }
}
