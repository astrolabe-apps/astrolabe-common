"use client";

import { SchemaEditor } from "@astroapps/schemas-editor";
import { ControlDefinitionSchemaMap } from "@__AppName__/client-common/schemas";
import { createStdFormRenderer } from "@/renderers";

export default function EditorPage() {
  return (
    <div className="h-screen">
      <SchemaEditor
        schemaMap={ControlDefinitionSchemaMap}
        rendererFactory={createStdFormRenderer}
      />
    </div>
  );
}
