import { ViewContext } from "./index";
import { FormControlEditor } from "../FormControlEditor";
import React from "react";
import { unsafeRestoreControl } from "@react-typed-forms/core";
export function ControlPropertiesView({ context }: { context: ViewContext }) {
  const { editorControls, editorFields, createEditorRenderer, getCurrentForm } =
    context;
  const sc = getCurrentForm()?.fields.selectedControl.value;
  if (!sc) return <div>Select a control</div>;
  return (
    <div className="h-full w-full overflow-auto">
      <FormControlEditor
        key={unsafeRestoreControl(sc.form.definition)?.uniqueId}
        controlNode={sc}
        editorControls={editorControls}
        editorFields={editorFields}
        createEditorRenderer={createEditorRenderer}
      />
    </div>
  );
}
