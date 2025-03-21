import {
  addMissingControlsForSchema,
  groupedControl,
  makeSchemaDataNode,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import { ViewContext } from "./index";
import React, { useMemo } from "react";
import { useControl } from "@react-typed-forms/core";

export function SchemaPropertiesView({ context }: { context: ViewContext }) {
  const { createEditorRenderer } = context;
  const schemaControl = useMemo(() => {
    const controls = addMissingControlsForSchema(
      context.schemaEditorFields,
      [],
    );
    return groupedControl(controls);
  }, []);
  const editorRenderer = createEditorRenderer([]);

  const data = useControl({});
  const dataNode = makeSchemaDataNode(context.schemaEditorFields, data);
  const Render = useControlRendererComponent(
    schemaControl,
    editorRenderer,
    {},
    dataNode,
  );
  return <Render />;
}
