import {
  addMissingControlsForSchema,
  groupedControl,
  makeSchemaDataNode,
  SchemaNode,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import { ViewContext } from "./index";
import React, { useMemo } from "react";
import { unsafeRestoreControl, useControl } from "@react-typed-forms/core";
import { createDataGridRenderer } from "@astroapps/schemas-datagrid";
import { InactiveView } from "./InactiveView";
import { createValueForFieldRenderer } from "@react-typed-forms/schemas-html";

export function SchemaPropertiesView({ context }: { context: ViewContext }) {
  const { getCurrentForm } = context;

  const sc = getCurrentForm()?.fields.selectedField.value;
  if (!sc) return <InactiveView>No field selected</InactiveView>;

  return <SchemaFieldEditor context={context} schema={sc} key={sc.id} />;
}

function SchemaFieldEditor({
  context,
  schema,
}: {
  context: ViewContext;
  schema: SchemaNode;
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
