import {
  Control,
  newControl,
  RenderOptional,
  useControl,
  useControlEffect,
  useDebounced,
} from "@react-typed-forms/core";
import { FormControlPreview } from "../FormControlPreview";
import {
  addMissingControlsForSchema,
  ControlDefinition,
  createSchemaDataNode,
  groupedControl,
  NewControlRenderer,
  SchemaDataNode,
  SchemaDataTree,
  SchemaNode,
} from "@react-typed-forms/schemas";
import React, { useMemo, Fragment } from "react";
import { FormPreview, PreviewData } from "../FormPreview";
import clsx from "clsx";
import { JsonEditor } from "../JsonEditor";
import { EditableForm, ViewContext } from "../types";

export function FormView(props: { formId: string; context: ViewContext }) {
  const { formId, context } = props;
  const control = context.getForm(formId);
  const previewData = useControl<PreviewData>({
    showing: false,
    showJson: false,
    showRawEditor: false,
    data: {},
    showMetadata: false,
  });
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
    true,
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
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2">
        <div className="flex gap-2 items-center">
          {checkbox(preview.fields.showing, "Preview Mode")}
          {button(save, "Save")}
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
        rootDefs.value,
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
            />
          </div>
        )}
        <div className={clsx("grow overflow-auto", context.editorPanelClass)}>
          <FormControlPreview
            keyPrefix="HAI"
            node={rootNode}
            parentDataNode={new EditorDataTree(schema.rootNode).rootNode}
            dropIndex={0}
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

class EditorDataTree extends SchemaDataTree {
  rootNode: SchemaDataNode;
  undefinedControl = newControl(undefined);

  getChild(parent: SchemaDataNode, childNode: SchemaNode): SchemaDataNode {
    return new SchemaDataNode(
      parent.id + "/" + childNode.field.field,
      childNode,
      undefined,
      this.undefinedControl,
      this,
      parent,
    );
  }
  getChildElement(
    parent: SchemaDataNode,
    elementIndex: number,
  ): SchemaDataNode {
    return new SchemaDataNode(
      parent.id + "/" + elementIndex,
      parent.schema,
      elementIndex,
      this.undefinedControl,
      this,
      parent,
    );
  }
  constructor(rootSchema: SchemaNode) {
    super();
    this.rootNode = new SchemaDataNode(
      "",
      rootSchema,
      undefined,
      newControl({}),
      this,
    );
  }
}

function FormJsonView({ root }: { root: Control<ControlDefinition[]> }) {
  const jsonControl = useControl(() =>
    JSON.stringify(root.current.value, null, 2),
  );
  useControlEffect(
    () => root.value,
    (x) => (jsonControl.value = JSON.stringify(x, null, 2)),
  );
  useControlEffect(() => jsonControl.value, useDebounced(updateControls, 300));
  return <JsonEditor className="h-64 m-4 border" control={jsonControl} />;

  function updateControls(json: string) {
    try {
      root.value = JSON.parse(json);
    } catch (e) {}
  }
}
