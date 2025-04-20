import { FormControlEditor } from "../FormControlEditor";
import React from "react";
import { unsafeRestoreControl } from "@react-typed-forms/core";
import { InactiveView } from "./InactiveView";
import { ViewContext } from "../types";

export function ControlPropertiesView({ context }: { context: ViewContext }) {
  const { editorControls, editorFields, createEditorRenderer, getCurrentForm } =
    context;
  const sc = getCurrentForm()?.fields.selectedControl.value;
  if (!sc) return <InactiveView>No control selected</InactiveView>;
  return (
    <div className="h-full w-full overflow-auto">
      <FormControlEditor
        viewContext={context}
        key={unsafeRestoreControl(sc.form.definition)?.uniqueId}
        controlNode={sc}
        editorControls={editorControls}
        editorFields={editorFields}
        createEditorRenderer={createEditorRenderer}
      />
    </div>
  );
}
