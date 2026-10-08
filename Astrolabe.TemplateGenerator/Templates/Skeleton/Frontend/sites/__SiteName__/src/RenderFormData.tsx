import { Control, RenderArrayElements } from "@react-typed-forms/core";
import {
  RenderForm,
  createFormTree,
  createSchemaTree,
  createSchemaDataNode,
  ControlDefinition,
} from "@react-typed-forms/schemas";
import { FormRenderer } from "@react-typed-forms/schemas";
import { useMemo } from "react";

export interface RenderFormDataProps<T> {
  data: Control<T>;
  controls: ControlDefinition[];
  schema: any; // The schema object (Record<string, SchemaField>)
  renderer: FormRenderer;
}

export function RenderFormData<T>({
  data,
  controls,
  schema,
  renderer,
}: RenderFormDataProps<T>) {
  const schemaTree = useMemo(() => createSchemaTree(schema), [schema]);
  const formTree = useMemo(() => createFormTree(controls), [controls]);
  const dataNode = useMemo(
    () => createSchemaDataNode(schemaTree.rootNode, data),
    [schemaTree, data]
  );

  return (
    <RenderArrayElements array={controls}>
      {() => (
        <RenderForm
          data={dataNode}
          form={formTree.rootNode}
          renderer={renderer}
        />
      )}
    </RenderArrayElements>
  );
}
