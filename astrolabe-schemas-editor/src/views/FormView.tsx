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
import React, { Fragment, useMemo } from "react";
import { FormPreview } from "../FormPreview";
import clsx from "clsx";
import { JsonEditor } from "../JsonEditor";
import { EditableForm, PreviewData, ViewContext } from "../types";
import { AgentAssistPanel } from "../components/AgentAssistPanel";
import { AgentCommand } from "../components/ChatInterface";
import { JsonDiff, calculateJsonDiff } from "../components/DiffViewer";

interface AgentModeState {
  enabled: boolean;
  pendingChanges: ControlDefinition[] | null;
  diff: JsonDiff | null;
  approvalState: "pending" | "approved" | "rejected" | null;
  commandHistory: AgentCommand[];
  isProcessing: boolean;
}

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

  // Agent mode state
  const agentMode = useControl<AgentModeState>({
    enabled: false,
    pendingChanges: null,
    diff: null,
    approvalState: null,
    commandHistory: [],
    isProcessing: false,
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
        <RenderFormDesign
          c={x}
          context={context}
          preview={previewData}
          agentMode={agentMode}
        />
      )}
    />
  );
}

function RenderFormDesign({
  c,
  context,
  preview,
  agentMode,
}: {
  c: Control<EditableForm>;
  preview: Control<PreviewData>;
  context: ViewContext;
  agentMode: Control<AgentModeState>;
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
  const formPreviewNode = useMemo(() => {
    return createPreviewNode(
      "ROOT",
      defaultSchemaInterface,
      rootNode,
      createSchemaDataNode(schema.rootNode, newControl({})),
      formRenderer,
    );
  }, []);
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2">
        <div className="flex gap-2 items-center justify-between">
          <div className="flex gap-2 items-center">
            {checkbox(preview.fields.showing, "Preview Mode")}
            {button(save, "Save")}
          </div>
          {!preview.fields.showing.value && (
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium text-gray-700">
                Agent Assistance
              </label>
              <button
                onClick={toggleAgentMode}
                className={clsx(
                  "px-3 py-1 rounded-lg transition-colors text-sm font-medium",
                  agentMode.fields.enabled.value
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700",
                )}
              >
                {agentMode.fields.enabled.value
                  ? "Disable Agent"
                  : "Enable Agent"}
              </button>
            </div>
          )}
        </div>
      </div>
      {renderContent()}
    </div>
  );

  function save() {
    context.saveForm(c);
    context.saveSchema?.(c);
  }

  function toggleAgentMode() {
    agentMode.fields.enabled.value = !agentMode.fields.enabled.value;
  }

  async function handleSendCommand(command: string) {
    const currentForm = context.getCurrentForm();
    if (!currentForm) {
      addToHistory(
        command,
        "No form is currently selected. Please select a form first.",
        false,
      );
      return;
    }

    agentMode.fields.isProcessing.value = true;

    try {
      // Check if Claude service is available
      if (!context.claudeService) {
        addToHistory(
          command,
          "Claude service is not available. Please ensure the API key is configured.",
          false,
        );
        return;
      }

      const result = await context.claudeService.processCommand(
        command,
        currentForm,
        context,
      );

      addToHistory(command, result.response, result.success);

      // If there's an updated form definition, show diff instead of applying directly
      if (result.updatedFormDefinition) {
        const currentControls =
          c.fields.formTree.value.getRootDefinitions().value;
        const diff = calculateJsonDiff(
          currentControls,
          result.updatedFormDefinition,
        );

        agentMode.value = {
          ...agentMode.value,
          pendingChanges: result.updatedFormDefinition,
          diff,
          approvalState: "pending",
        };
      }
    } catch (error) {
      addToHistory(
        command,
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        false,
      );
    } finally {
      agentMode.fields.isProcessing.value = false;
    }
  }

  function addToHistory(cmd: string, response: string, success: boolean) {
    const newCommand: AgentCommand = {
      id: Date.now().toString(),
      command: cmd,
      response,
      timestamp: new Date().toISOString(),
      success,
    };
    agentMode.fields.commandHistory.setValue((prev) => [...prev, newCommand]);
  }

  function handleApproveChanges() {
    if (agentMode.fields.pendingChanges.value) {
      const rootDefinitions = c.fields.formTree.value.getRootDefinitions();
      rootDefinitions.value = agentMode.fields.pendingChanges.value;

      agentMode.value = {
        ...agentMode.value,
        pendingChanges: null,
        diff: null,
        approvalState: "approved",
      };

      addToHistory(
        "Apply Changes",
        "Form changes have been applied successfully.",
        true,
      );
    }
  }

  function handleRejectChanges() {
    agentMode.value = {
      ...agentMode.value,
      pendingChanges: null,
      diff: null,
      approvalState: "rejected",
    };

    addToHistory("Reject Changes", "Form changes have been rejected.", true);
  }

  function handleClearHistory() {
    agentMode.fields.commandHistory.value = [];

    // Also clear the Claude service conversation history
    if (context.claudeService) {
      context.claudeService.clearHistory(c);
    }
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
        <div
          className={clsx(
            "grow overflow-auto",
            agentMode.fields.enabled.value
              ? "grid grid-cols-1 lg:grid-cols-2 gap-4 px-4"
              : "",
          )}
        >
          <div
            className={clsx(
              agentMode.fields.enabled.value
                ? "overflow-auto"
                : "grow overflow-auto",
              context.editorPanelClass,
            )}
          >
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

          {agentMode.fields.enabled.value && (
            <div className="overflow-auto">
              <AgentAssistPanel
                onChangesProposed={() => {}} // Not used in new workflow
                pendingChanges={agentMode.fields.pendingChanges.value}
                currentControls={
                  c.fields.formTree.value.getRootDefinitions().value
                }
                diff={agentMode.fields.diff.value}
                onApprove={handleApproveChanges}
                onReject={handleRejectChanges}
                commandHistory={agentMode.fields.commandHistory.value}
                isProcessing={agentMode.fields.isProcessing.value}
                onSendCommand={handleSendCommand}
                onClearHistory={handleClearHistory}
                currentFormName={c.fields.name.value || "Unnamed Form"}
              />
            </div>
          )}
        </div>
      </>
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
