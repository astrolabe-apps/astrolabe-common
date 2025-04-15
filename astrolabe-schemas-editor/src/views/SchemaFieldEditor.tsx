import { unsafeRestoreControl } from "@react-typed-forms/core";
import {
  makeSchemaDataNode,
  SchemaNode,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import { createDataGridRenderer } from "@astroapps/schemas-datagrid";
import { createValueForFieldRenderer } from "@react-typed-forms/schemas-html";
import React, { useMemo } from "react";
import { ViewContext } from "./index";

export function SchemaFieldEditor({
  schema,
  context,
}: {
  schema: SchemaNode;
  context: ViewContext;
}) {
  const { createEditorRenderer } = context;
  const editorRenderer = useMemo(
    () =>
      createEditorRenderer([
        createValueForFieldRenderer({ schema }),
        createDataGridRenderer(),
      ]),
    [],
  );
  const dataNode = makeSchemaDataNode(
    context.schemaEditorFields,
    unsafeRestoreControl(schema.field)!,
  );
  const Render = useControlRendererComponent(
    context.schemaEditorControls.rootNode,
    editorRenderer,
    {},
    dataNode,
  );
  return <Render />;
}
