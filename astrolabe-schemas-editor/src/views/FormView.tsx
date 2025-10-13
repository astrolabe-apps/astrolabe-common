import {
  Control,
  newControl,
  RenderOptional,
  useControl,
  useControlEffect,
  useDebounced,
} from "@react-typed-forms/core";
import { createPreviewNode, FormControlPreview } from "../FormControlPreview";
import {
  addMissingControlsForSchema,
  ControlDefinition,
  createSchemaDataNode,
  groupedControl,
  NewControlRenderer,
  defaultSchemaInterface,
} from "@react-typed-forms/schemas";
import React, { Fragment, useMemo, useEffect, useRef } from "react";
import { FormPreview } from "../FormPreview";
import clsx from "clsx";
import { JsonEditor } from "../JsonEditor";
import { EditableForm, PreviewData, ViewContext } from "../types";
import { useFormUndoRedo } from "../hooks/useFormUndoRedo";

export function FormView(props: { formId: string; context: ViewContext }) {
  const { formId, context } = props;
  const control = context.getForm(formId);
  const previewData = useControl<PreviewData>(() => ({
    showing: false,
    showJson: false,
    showRawEditor: false,
    data: {},
    showMetadata: false,
    disabled: false,
    readonly: false,
    displayOnly: false,
    formId,
  }));
  useControlEffect(
    () =>
      [
        control.fields.formTree.value?.control.dirty ||
          control.fields.config.dirty,
        control.fields.name.value,
      ] as const,
    ([unsaved, name]) => {
      if (name) {
        context.updateTabTitle("form:" + formId, unsaved ? name + " *" : name);
      }
    },
    true
  );
  return (
    <RenderOptional
      control={control}
      children={(x) => (
        <RenderFormDesign c={x} context={context} preview={previewData} />
      )}
    />
  );
}

function RenderFormDesign({
  c,
  context,
  preview,
}: {
  c: Control<EditableForm>;
  preview: Control<PreviewData>;
  context: ViewContext;
}) {
  const {
    createEditorRenderer,
    previewOptions,
    validation,
    extraPreviewControls,
    button,
    checkbox,
  } = context;
  const {
    formTree: { value: tree },
    renderer: { value: formRenderer },
    configSchema: { value: configSchema },
    configOptions: { value: configOptions },
    config,
  } = c.fields;
  const schema = context.getSchemaForForm(c);
  const rootNode = tree.rootNode;
  const configDefinition = useMemo(() => {
    const controls = configSchema
      ? addMissingControlsForSchema(configSchema, [])
      : [];
    return groupedControl(controls);
  }, [configSchema]);
  const formPreviewNode = useMemo(() => {
    return createPreviewNode(
      "ROOT",
      defaultSchemaInterface,
      rootNode,
      createSchemaDataNode(schema.rootNode, newControl({})),
      formRenderer
    );
  }, []);

  // Undo/Redo functionality
  const { undo, redo, canUndo, canRedo } = useFormUndoRedo(c);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd on Mac, Ctrl on Windows/Linux
      const isMod = e.metaKey || e.ctrlKey;

      if (!isMod) return;

      // Undo: Ctrl+Z or Cmd+Z
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Shift+Z
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
        return;
      }
    };

    const container = containerRef.current;
    if (container) {
      // Attach to container so it only works when this form is active
      container.addEventListener("keydown", handleKeyDown);
      return () => container.removeEventListener("keydown", handleKeyDown);
    }
  }, [undo, redo]);

  return (
    <div ref={containerRef} className="flex flex-col h-full" tabIndex={-1}>
      <div className="px-4 py-2">
        <div className="flex gap-2 items-center">
          {checkbox(preview.fields.showing, "Preview Mode")}
          {button(save, "Save")}
          <div className="flex gap-1">
            <button
              onClick={undo}
              disabled={!canUndo.value}
              className="px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <i className="fa fa-undo" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo.value}
              className="px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <i className="fa fa-redo" />
            </button>
          </div>
        </div>
      </div>
      {renderContent()}
    </div>
  );

  function save() {
    context.saveForm(c);
    context.saveSchema?.(c);
  }

  function addMissing() {
    if (schema) {
      const rootDefs = tree.getRootDefinitions();
      rootDefs.value = addMissingControlsForSchema(
        schema.rootNode,
        rootDefs.value
      );
    }
  }

  function renderContent() {
    if (preview.fields.showing.value)
      return (
        <FormPreview
          viewContext={context}
          rootSchema={schema.rootNode}
          controls={rootNode}
          previewData={preview}
          formRenderer={formRenderer}
          validation={validation}
          previewOptions={previewOptions}
          createEditorRenderer={createEditorRenderer}
          editorPanelClass={context.editorPanelClass}
          // rootControlClass={rootControlClass}
          // controlsClass={controlsClass}
          extraPreviewControls={extraPreviewControls}
        />
      );

    return (
      <>
        <div className="flex gap-4 px-4 mb-2">
          {checkbox(c.fields.hideFields, "Hide Field Names")}
          {button(addMissing, "Add Missing Controls")}
          {checkbox(c.fields.showJson, "Show JSON")}
          {configSchema && checkbox(c.fields.showConfig, "Show Config")}
        </div>
        {c.fields.showJson.value && (
          <FormJsonView root={c.fields.formTree.value.getRootDefinitions()} />
        )}
        {c.fields.showConfig.value && configSchema && (
          <div className="p-4">
            <NewControlRenderer
              definition={configDefinition}
              renderer={context.editorFormRenderer}
              parentDataNode={createSchemaDataNode(configSchema, config)}
              options={configOptions}
            />
          </div>
        )}
        <div className={clsx("grow overflow-auto", context.editorPanelClass)}>
          <FormControlPreview
            node={formPreviewNode}
            context={{
              selected: c.fields.selectedControlId,
              VisibilityIcon: <i className="fa fa-eye" />,
              renderer: formRenderer,
              hideFields: c.fields.hideFields,
            }}
          />
        </div>
      </>
    );
  }
}

function FormJsonView({ root }: { root: Control<ControlDefinition[]> }) {
  const jsonControl = useControl(() =>
    JSON.stringify(root.current.value, null, 2)
  );
  useControlEffect(
    () => root.value,
    (x) => (jsonControl.value = JSON.stringify(x, null, 2))
  );
  useControlEffect(() => jsonControl.value, useDebounced(updateControls, 300));
  return <JsonEditor className="h-64 m-4 border" control={jsonControl} />;

  function updateControls(json: string) {
    try {
      root.value = JSON.parse(json);
    } catch (e) {}
  }
}
