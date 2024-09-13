import React, { createContext, useMemo } from "react";
import { RenderNode } from "./RenderNode";
import {
  ControlDefinition,
  ControlRenderer,
  defaultSchemaInterface,
  defaultTailwindTheme,
  SchemaField,
} from "@react-typed-forms/schemas";
import { createFormLookup, createSchemaLookup, schemaDataNode } from "./index";
import { Control } from "@react-typed-forms/core";
import { createDefaultFormRenderer } from "./render";

const newRenderer = createDefaultFormRenderer(defaultTailwindTheme);

export function NextGenRender({
  definition,
  fields,
  control,
}: {
  definition: ControlDefinition;
  fields: SchemaField[];
  control: Control<unknown>;
}) {
  const schemaLookup = useMemo(
    () => createSchemaLookup({ Self: fields }),
    [fields],
  );
  const formTree = useMemo(
    () => createFormLookup({ form: [definition] }),
    [definition],
  );
  return (
    <RenderNode
      dataNode={schemaDataNode(schemaLookup.getSchema("Self")!, control)}
      formNode={formTree.getForm("form")!.rootNode}
      formOptions={{
        RenderForm: RenderNode,
        schemaInterface: defaultSchemaInterface,
        renderer: newRenderer,
      }}
    />
  );
}
