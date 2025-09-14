import React, { useMemo } from "react";
import { Control, useControl, useControlEffect } from "@react-typed-forms/core";
import { ViewContext } from "../types";
import { ControlDefinition } from "@react-typed-forms/schemas";
import {
  dataControl,
  groupedControl,
  actionControl,
  textDisplayControl,
  accordionOptions,
  textfieldOptions,
  dynamicDisabled,
  dynamicVisibility,
  dataExpr,
  jsonataExpr,
  buildSchema,
  stringField,
  boolField,
  compoundField,
  dateTimeField,
  makeActions,
} from "@react-typed-forms/schemas";
import {
  RenderForm,
  createSchemaDataNode,
  createFormTree,
  createSchemaTree,
} from "@react-typed-forms/schemas";

interface AgentCommand {
  id: string;
  command: string;
  response: string;
  timestamp: string; // ISO datetime string
  success: boolean;
}

interface AgentData {
  command: string;
  isProcessing: boolean;
  commandHistory: AgentCommand[];
  currentFormName: string;
}

// Create schema for AgentCommand
const AgentCommandSchema = buildSchema<AgentCommand>({
  id: stringField("ID"),
  command: stringField("Command"),
  response: stringField("Response"),
  timestamp: dateTimeField("Time"),
  success: boolField("Success"),
});

// Create schema for AgentData
const AgentDataSchema = buildSchema<AgentData>({
  command: stringField("Command"),
  isProcessing: boolField("Processing"),
  commandHistory: compoundField("Command History", AgentCommandSchema, {
    collection: true,
  }),
  currentFormName: stringField("Current Form"),
});

// Create the schema tree from the schema fields
const agentSchemaTree = createSchemaTree(AgentDataSchema);

interface AgentViewProps {
  context: ViewContext;
}

export function AgentView({ context }: AgentViewProps) {
  const agentData = useControl<AgentData>({
    command: "",
    isProcessing: false,
    commandHistory: [],
    currentFormName: context.currentForm.value || "None selected",
  });

  // Update current form name when selection changes
  useControlEffect(
    () => context.currentForm.value,
    (formId) => {
      agentData.fields.currentFormName.value = formId
        ? context.formList.find((f) => f.id === formId)?.name || formId
        : "None selected";
    },
    true,
  );

  const agentControls = useMemo<ControlDefinition[]>(
    () => [
      // Command input section
      groupedControl(
        [
          dataControl("command", "Enter Command", {
            required: true,
            layoutClass: "mb-3",
            labelClass: "text-sm font-medium text-gray-700 mb-1 block",
            ...textfieldOptions({
              placeholder:
                "e.g., 'add text field named email' or 'make all fields required'",
              multiline: false,
            }),
            styleClass:
              "w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200",
          }),
          actionControl("Execute", "executeCommand", {
            dynamic: [dynamicDisabled(dataExpr("isProcessing"))],
            layoutClass: "flex justify-end",
            styleClass:
              "inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          }),
        ],
        "🤖 Command Interface",
        {
          styleClass:
            "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4 shadow-sm",
        },
      ),

      // Status and current form
      groupedControl(
        [
          dataControl("currentFormName", "📄 Current Form", {
            readonly: true,
            layoutClass: "mb-2",
            labelClass: "text-xs font-medium text-gray-600 mb-1 block",
            styleClass:
              "text-sm bg-gray-50 px-3 py-2 rounded-md border font-mono text-gray-800",
          }),
          dataControl("isProcessing", "⚡ Status", {
            readonly: true,
            layoutClass: "mb-2",
            labelClass: "text-xs font-medium text-gray-600 mb-1 block",
            styleClass: "text-sm font-medium px-2 py-1 rounded-md",
            dynamic: [
              {
                type: "Display",
                expr: jsonataExpr(
                  "isProcessing ? '🔄 Processing command...' : '✅ Ready'",
                ),
              },
            ],
          }),
        ],
        "📊 Status & Context",
        {
          styleClass: "bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4",
        },
      ),

      // Command History section
      groupedControl(
        [
          dataControl("commandHistory", "📜 Command History", {
            readonly: true,
            renderOptions: { type: "Array" },
            layoutClass: "mb-3",
            labelClass: "text-sm font-medium text-gray-700 mb-2 block",
            styleClass:
              "bg-white border rounded-lg shadow-sm max-h-64 overflow-y-auto p-3",
            children: [
              dataControl("timestamp", "⏰ Time", {
                layoutClass: "w-20",
                labelClass: "sr-only",
                styleClass: "text-xs text-gray-500 font-mono",
                dynamic: [
                  {
                    type: "Display",
                    expr: jsonataExpr(
                      "$formatBase($millis(), '[H01]:[m01]:[s01]')",
                    ),
                  },
                ],
              }),
              dataControl("command", "💬 Command", {
                layoutClass: "flex-1 min-w-0",
                labelClass: "sr-only",
                styleClass: "text-sm font-medium text-blue-700 truncate",
              }),
              dataControl("response", "📝 Response", {
                layoutClass: "flex-2 min-w-0",
                labelClass: "sr-only",
                styleClass: "text-sm text-gray-700 truncate",
              }),
              dataControl("success", "Status", {
                layoutClass: "w-8 flex-shrink-0",
                labelClass: "sr-only",
                styleClass: "text-lg text-center",
                dynamic: [
                  {
                    type: "Display",
                    expr: jsonataExpr("success ? '✅' : '❌'"),
                  },
                ],
              }),
            ],
            dynamic: [
              dynamicVisibility(jsonataExpr("$count(commandHistory) > 0")),
            ],
          }),
          actionControl("Clear History", "clearHistory", {
            layoutClass: "flex justify-end",
            styleClass:
              "inline-flex items-center px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-md transition-colors duration-200",
            dynamic: [
              dynamicDisabled(jsonataExpr("$count(commandHistory) = 0")),
            ],
          }),
        ],
        "📚 Command History",
        {
          styleClass:
            "bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4",
        },
      ),

      // Help section (collapsible)
      groupedControl(
        [
          textDisplayControl("**Field Operations:**"),
          textDisplayControl(
            '• `add text field named "email"` - Add new text input field',
          ),
          textDisplayControl(
            '• `add number field named "age"` - Add numeric input field',
          ),
          textDisplayControl(
            '• `add checkbox field named "subscribe"` - Add checkbox field',
          ),
          textDisplayControl(
            '• `remove field "fieldname"` - Remove existing field',
          ),
          textDisplayControl(
            '• `rename field "oldname" to "newname"` - Rename field',
          ),
          textDisplayControl(""),
          textDisplayControl("**Validation & Properties:**"),
          textDisplayControl(
            '• `make field "email" required` - Make specific field required',
          ),
          textDisplayControl(
            "• `make all fields required` - Make all fields required",
          ),
          textDisplayControl(
            '• `add email validation to field "email"` - Add email validation',
          ),
          textDisplayControl(""),
          textDisplayControl("**Structure:**"),
          textDisplayControl(
            '• `add section called "Personal Info"` - Create new grouped section',
          ),
          textDisplayControl(
            '• `move field "name" to section "Personal Info"` - Move field to section',
          ),
        ],
        "Available Commands",
        {
          adornments: [
            accordionOptions({
              title: "Available Commands",
              defaultExpanded: false,
            }),
          ],
        },
      ),
    ],
    [],
  );

  const actionOnClick = useMemo(
    () =>
      makeActions({
        executeCommand: async (_actionData, _ctx) => {
          const currentForm = context.getCurrentForm();
          if (!currentForm) {
            addToHistory(
              agentData.fields.command.value,
              "No form is currently selected. Please select a form first.",
              false,
            );
            agentData.fields.command.value = "";
            return;
          }

          const command = agentData.fields.command.value.trim();
          if (!command) return;

          agentData.fields.isProcessing.value = true;

          try {
            // Check if Claude service is available
            if (!context.claudeService) {
              addToHistory(
                command,
                "Claude service is not available. Please ensure the API key is configured in the BasicFormEditor.",
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
            
            // If there's an updated form definition, apply it
            if (result.updatedFormDefinition) {
              const applyResult = await context.claudeService.applyUpdatedFormDefinition(
                result.updatedFormDefinition,
                currentForm,
                context
              );
              
              if (!applyResult.success && applyResult.errors.length > 0) {
                addToHistory(
                  "Apply Form Changes",
                  `Failed to apply changes: ${applyResult.errors.join(', ')}`,
                  false
                );
              }
            }
          } catch (error) {
            addToHistory(
              command,
              `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              false,
            );
          } finally {
            agentData.fields.isProcessing.value = false;
            agentData.fields.command.value = "";
          }
        },

        clearHistory: async (_actionData, _ctx) => {
          agentData.fields.commandHistory.value = [];
        },
      }),
    [agentData, context],
  );

  const addToHistory = (cmd: string, response: string, success: boolean) => {
    const newCommand: AgentCommand = {
      id: Date.now().toString(),
      command: cmd,
      response,
      timestamp: new Date().toISOString(),
      success,
    };
    agentData.fields.commandHistory.setValue((prev) => [...prev, newCommand]);
  };

  const formTree = useMemo(() => {
    return createFormTree([groupedControl(agentControls, "Form Agent")]);
  }, [agentControls]);

  return (
    <div className={`h-full ${context.editorPanelClass}`}>
      <RenderForm
        form={formTree.rootNode}
        data={createSchemaDataNode(agentSchemaTree.rootNode, agentData)}
        renderer={context.editorFormRenderer}
        options={{ actionOnClick }}
      />
    </div>
  );
}

