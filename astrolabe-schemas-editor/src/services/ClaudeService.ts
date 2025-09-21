import { ViewContext, EditableForm, ConversationMessage } from "../types";
import { ControlDefinition, SchemaField } from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";
import {
  visitControlDefinition,
  ControlVisitor,
  DataControlDefinition,
  GroupedControlsDefinition,
  DisplayControlDefinition,
  ActionControlDefinition,
} from "@react-typed-forms/schemas";

export interface ClaudeResponse {
  response: string;
  success: boolean;
  updatedFormDefinition?: ControlDefinition[];
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicMessageResponse {
  content: Array<{
    type: "text" | "tool_use";
    text?: string;
    name?: string;
    input?: any;
  }>;
}

export class ClaudeService {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
  }

  /**
   * Clear conversation history for a specific form
   */
  clearHistory(currentForm: Control<EditableForm>): void {
    // Use Control API to properly update the conversation history
    if (currentForm.fields.conversationHistory) {
      currentForm.fields.conversationHistory.value = [];
    }
  }

  /**
   * Get conversation history for a specific form
   */
  getHistory(currentForm: Control<EditableForm>): ConversationMessage[] {
    return currentForm.fields.conversationHistory?.value || [];
  }

  /**
   * Process an agent command using Claude to directly manipulate form JSON
   */
  async processCommand(
    command: string,
    currentForm: Control<EditableForm | undefined>,
    context: ViewContext,
  ): Promise<ClaudeResponse> {
    const editableForm = currentForm.value;
    if (!editableForm) {
      throw "No selected form";
    }

    try {
      const formControl = currentForm as Control<EditableForm>;

      // Initialize conversation history if it doesn't exist
      const conversationHistoryControl = formControl.fields.conversationHistory;
      if (!conversationHistoryControl?.value) {
        if (conversationHistoryControl) {
          conversationHistoryControl.value = [];
        }
      }

      const currentFormDefinition =
        editableForm.formTree.getRootDefinitions().value;
      const systemPrompt = this.createSystemPrompt(
        editableForm,
        currentFormDefinition,
      );

      const conversationHistory = conversationHistoryControl?.value || [];

      // Always include current form state, but use different prompts for first vs follow-up messages
      const userPrompt =
        conversationHistory.length === 0
          ? this.createDetailedUserPrompt(
              command,
              currentFormDefinition,
              currentForm.as(),
              context,
            )
          : this.createFollowUpUserPrompt(
              command,
              currentFormDefinition,
              currentForm.as(),
              context,
            );

      // Build messages array from conversation history plus current message
      const messages: AnthropicMessage[] = [
        ...conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user" as const,
          content: userPrompt,
        },
      ];

      // Call the proxy endpoint instead of Anthropic directly
      const fetchResponse = await fetch(`${this.apiUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 8192,
          system: systemPrompt,
          messages,
          tools: [
            {
              name: "update_form_definition",
              description: "Update the form definition with new structure",
              input_schema: {
                type: "object",
                properties: {
                  explanation: {
                    type: "string",
                    description: "Brief explanation of what changes were made",
                  },
                  form_definition: {
                    type: "array",
                    description:
                      "The complete updated form definition as an array of control definitions",
                    items: {
                      type: "object",
                      description: "A control definition object",
                    },
                  },
                },
                required: ["explanation", "form_definition"],
              },
            },
          ],
        }),
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`);
      }

      const message: AnthropicMessageResponse = await fetchResponse.json();

      // Add user message to history using Control API
      const newUserMessage: ConversationMessage = {
        role: "user",
        content: command, // Store the simple command, not the detailed prompt
      };
      if (conversationHistoryControl) {
        conversationHistoryControl.setValue((prev) => [
          ...(prev || []),
          newUserMessage,
        ]);
      }

      const response = this.processClaudeResponse(
        message,
        editableForm,
        context,
      );

      // Add assistant response to history using Control API
      const newAssistantMessage: ConversationMessage = {
        role: "assistant",
        content: response.response,
      };
      if (conversationHistoryControl) {
        conversationHistoryControl.setValue((prev) => [
          ...(prev || []),
          newAssistantMessage,
        ]);
      }

      return response;
    } catch (error) {
      console.error("Claude API error:", error);
      return {
        response: `Error communicating with Claude: ${error instanceof Error ? error.message : "Unknown error"}`,
        success: false,
      };
    }
  }

  /**
   * Create system prompt for tool-based form manipulation
   */
  private createSystemPrompt(
    currentForm: EditableForm,
    _currentFormDefinition: ControlDefinition[],
  ): string {
    const formInfo = this.extractFormInfo(currentForm);

    return `You are an AI assistant that helps users modify form schemas using structured tools. You have deep knowledge of the Astrolabe control definition system.

You will receive:
1. A user request for form modifications
2. The current form definition as JSON

Your task:
1. Understand the user's request
2. Analyze the current form structure
3. Use the update_form_definition tool to apply changes

# Control Definition System

## Core Control Types

**DataControlDefinition - Form Input Controls:**
{
  "type": "Data",
  "field": "fieldName",           // Required: field name for data binding
  "title": "Display Label",       // Optional: label text
  "required": true/false,         // Optional: validation requirement
  "readonly": true/false,         // Optional: read-only state
  "disabled": true/false,         // Optional: disabled state
  "hidden": true/false,           // Optional: visibility
  "defaultValue": "value",        // Optional: default value
  "styleClass": "css-classes",    // Optional: control styling
  "layoutClass": "css-classes",   // Optional: container styling  
  "labelClass": "css-classes",    // Optional: label styling
  "renderOptions": { /* see render types below */ },
  "validators": [ /* validation rules */ ],
  "dynamic": [ /* dynamic properties */ ],
  "adornments": [ /* UI enhancements */ ]
}

**GroupedControlsDefinition - Container Controls:**
{
  "type": "Group",
  "title": "Section Title",       // Optional: section header
  "styleClass": "css-classes",    // Optional: container styling
  "children": [ /* array of controls */ ],
  "groupOptions": {
    "type": "Standard",           // Layout type (see group types below)
    "hideTitle": true/false,      // Optional: hide section title
    "displayOnly": true/false     // Optional: read-only mode
  }
}

**ActionControlDefinition - Interactive Buttons:**
{
  "type": "Action",
  "title": "Button Text",
  "actionId": "actionName",       // Required: action identifier
  "styleClass": "css-classes",   // Optional: button styling
  "actionStyle": "Button",       // Optional: Button, Secondary, Link
  "icon": {                      // Optional: icon reference
    "library": "FontAwesome",    // FontAwesome, Material, CssClass
    "name": "icon-name"
  }
}

**DisplayControlDefinition - Read-only Elements:**
{
  "type": "Display",
  "styleClass": "css-classes",
  "displayData": {
    "type": "Text",              // Text, Html, Icon, Custom
    "text": "Display content"    // Content to display
  }
}

## Data Control Render Types

**Text Input Controls:**
- "Standard" - Default based on field type
- "Textfield" - Text input with options:
  {
    "type": "Textfield",
    "placeholder": "Enter text...",
    "multiline": true/false       // For textarea
  }
- "DisplayOnly" - Read-only display:
  {
    "type": "DisplayOnly",
    "emptyText": "No value set"
  }

**Selection Controls:**
- "Dropdown" - Select dropdown (options come from schema)
- "Radio" - Radio button group (options from schema)
- "Checkbox" - Single checkbox
- "CheckList" - Multiple selection checkboxes
- "Autocomplete" - Type-ahead search

**Specialized Controls:**
- "DateTime" - Date/time picker:
  {
    "type": "DateTime",
    "format": "YYYY-MM-DD",      // Optional: date format
    "forceMidnight": true/false   // Optional: time handling
  }
- "Array" - Dynamic array editor:
  {
    "type": "Array",
    "addText": "Add Item",       // Optional: add button text
    "removeText": "Remove",      // Optional: remove button text
    "noAdd": true/false,         // Optional: disable adding
    "noRemove": true/false,      // Optional: disable removal
    "noReorder": true/false      // Optional: disable reordering
  }
- "HtmlEditor" - Rich text editor:
  {
    "type": "HtmlEditor",
    "allowImages": true/false
  }

## Group Control Layout Types

**Layout Options:**
- "Standard" - Vertical stacking
- "Grid" - CSS Grid layout:
  {
    "type": "Grid",
    "columns": 2,                // Optional: number of columns
    "rowClass": "css-classes",   // Optional: row styling
    "cellClass": "css-classes"   // Optional: cell styling
  }
- "Flex" - Flexbox layout:
  {
    "type": "Flex",
    "direction": "row",          // Optional: row, column
    "gap": "1rem"                // Optional: gap size
  }
- "Tabs" - Tabbed interface
- "Dialog" - Modal dialog container
- "Accordion" - Collapsible sections
- "Wizard" - Step-by-step flow

## Dynamic Properties for Conditional Behavior

**Dynamic Property Types:**
- "Visible" - Show/hide based on conditions
- "DefaultValue" - Set dynamic defaults
- "Readonly" - Conditional read-only
- "Disabled" - Conditional disabled
- "Label" - Dynamic label text

Example dynamic property:
{
  "type": "Visible",
  "expr": {
    "type": "jsonata",
    "expression": "fieldName = 'show'"  // JSONata expression
  }
}

## Control Adornments for Enhanced UX

**Adornment Types:**
- "Tooltip" - Contextual help:
  {
    "type": "Tooltip",
    "tooltip": "Help text here"
  }
- "HelpText" - Extended help:
  {
    "type": "HelpText", 
    "helpText": "Detailed explanation",
    "placement": "ControlEnd"     // ControlStart, ControlEnd, LabelStart, LabelEnd
  }
- "Icon" - Visual indicators:
  {
    "type": "Icon",
    "iconClass": "fa-info",
    "icon": {
      "library": "FontAwesome",
      "name": "info-circle"
    }
  }

Current Form:
- Name: ${formInfo.name}
- Fields: ${formInfo.fields.join(", ")}

## Schema-First Approach

**ALWAYS reference the provided schema to:**
- Verify field existence before creating Data controls
- Use correct field types and validation
- Respect enumValues for dropdown/selection controls
- Apply schema-defined constraints
- Understand field relationships and dependencies

**Schema Property Mapping:**
- Schema "required" → Control "required": true
- Schema "enumValues" → Use Dropdown/Radio render types
- Schema "maxLength" → Add appropriate validation
- Schema nested objects → Use Group controls

## Common Modification Patterns

**Adding a new field:**
- Always check schema for field type and constraints
- Use appropriate render type for data type
- Consider validation requirements
- Place logically within form structure

**Example: Adding a text field**
{
  "type": "Data",
  "field": "description",
  "title": "Description",
  "required": false,
  "renderOptions": {
    "type": "Textfield",
    "placeholder": "Enter description...",
    "multiline": true
  }
}

**Example: Adding a dropdown from schema**
{
  "type": "Data",
  "field": "status",
  "title": "Status",
  "required": true,
  "renderOptions": {
    "type": "Dropdown"
  }
}

## Critical Validation Rules

**MUST VALIDATE:**
- All field names exist in schema before adding Data controls
- Required properties are never removed
- Array structures maintain proper nesting
- Group children arrays are never empty
- Field references match schema exactly (case-sensitive)

**COMMON MISTAKES TO AVOID:**
- Using field names not in schema
- Missing required properties in control definitions
- Inconsistent naming conventions
- Breaking parent-child relationships in groups

## Decision Framework

**When adding fields, consider:**
1. Schema constraints (required, type, validation)
2. User workflow and logical grouping
3. Form length and complexity
4. Mobile/responsive considerations

**When organizing fields:**
- Group related fields together
- Place required fields prominently
- Consider conditional logic dependencies
- Maintain intuitive flow

## User Experience Guidelines

**Form Design Principles:**
- Progressive disclosure (show most important fields first)
- Logical grouping and clear section headers
- Appropriate field sizes and input types
- Clear validation messages and help text
- Consistent styling and spacing

**Accessibility Considerations:**
- Meaningful labels and titles
- Proper field associations
- Helpful placeholder text and descriptions
- Logical tab order through groups

## Guidelines for Form Manipulation

**Best Practices:**
- Preserve existing structure when possible
- Use descriptive field names (camelCase or snake_case)
- Apply appropriate render types for data types
- Use groups to organize related fields
- Add validation for required/important fields
- Consider UX with appropriate styling classes
- Use dynamic properties for conditional logic
- Add helpful adornments (tooltips, help text)

**Common Styling Classes:**
- layoutClass: "mb-4" (spacing), "grid grid-cols-2 gap-4" (layout)
- styleClass: "border rounded-lg p-3" (containers), "px-3 py-2 border" (inputs)
- labelClass: "text-sm font-medium mb-1 block" (labels)

**Field Naming Conventions:**
- Use clear, descriptive names
- Follow consistent naming patterns
- Use appropriate data types in schema

## Response Requirements

**Always explain your reasoning:**
- Why you chose specific control types
- How you organized the form structure
- What schema constraints influenced decisions
- Any assumptions made about user intent

**Structure your response:**
1. Brief summary of changes
2. Explanation of key decisions
3. Any recommendations or alternatives considered

IMPORTANT: Always use the update_form_definition tool to make changes. Include the complete updated form definition, not just the changes.`;
  }

  /**
   * Create detailed user prompt with command, current form JSON, and complete schema (for first message)
   */
  private createDetailedUserPrompt(
    command: string,
    currentFormDefinition: ControlDefinition[],
    editableForm: Control<EditableForm>,
    context: ViewContext,
  ): string {
    // Get the complete schema for this form using ViewContext
    let formSchema: SchemaField[] = [];
    try {
      formSchema = context.getSchemaForForm(editableForm).getRootFields().value;
    } catch (error) {
      console.warn("Could not get schema for form:", error);
    }

    return `**User Request:** ${command}

**Current Form Definition:**
\`\`\`json
${JSON.stringify(currentFormDefinition, null, 2)}
\`\`\`

**Form Schema:**
\`\`\`json
${JSON.stringify(formSchema, null, 2)}
\`\`\`

**Context:**
- Form schema provides the complete data structure, field types, validation rules, and options
- Use schema information to understand what fields are available and their constraints
- When adding dropdown/selection fields, check schema for enumValues/options
- Respect field types and validation rules from schema
- Consider schema relationships when organizing form structure

Please modify this form definition according to the user's request and return the complete updated form definition.`;
  }

  /**
   * Create follow-up prompt with current form state (for subsequent messages in conversation)
   */
  private createFollowUpUserPrompt(
    command: string,
    currentFormDefinition: ControlDefinition[],
    editableForm: Control<EditableForm>,
    context: ViewContext,
  ): string {
    // Get the complete schema for this form using ViewContext
    let formSchema: SchemaField[] = [];
    try {
      formSchema = context.getSchemaForForm(editableForm).getRootFields().value;
    } catch (error) {
      console.warn("Could not get schema for form:", error);
    }

    return `**Follow-up Request:** ${command}

**Current Form Definition:**
\`\`\`json
${JSON.stringify(currentFormDefinition, null, 2)}
\`\`\`

**Form Schema:**
\`\`\`json
${JSON.stringify(formSchema, null, 2)}
\`\`\`

Please continue working with this form definition and make the requested changes.`;
  }

  /**
   * Process Claude's response and extract tool calls
   */
  private processClaudeResponse(
    message: AnthropicMessageResponse,
    _currentForm: EditableForm,
    _context: ViewContext,
  ): ClaudeResponse {
    const textContent = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text || "")
      .join("\n");

    // Look for tool use in the response
    const toolUses = message.content.filter(
      (block) => block.type === "tool_use",
    );

    // Find the update_form_definition tool call
    const updateFormTool = toolUses.find(
      (tool) => tool.name === "update_form_definition",
    );

    if (!updateFormTool) {
      return {
        response: textContent || "No form changes were requested.",
        success: false,
      };
    }

    try {
      const toolInput = updateFormTool.input as {
        explanation: string;
        form_definition: ControlDefinition[];
      };

      // Validate the tool input
      if (!toolInput.explanation || !Array.isArray(toolInput.form_definition)) {
        return {
          response: "Invalid tool response format",
          success: false,
        };
      }

      return {
        response: toolInput.explanation,
        success: true,
        updatedFormDefinition: toolInput.form_definition,
      };
    } catch (error) {
      console.error("Error processing tool response:", error);
      return {
        response:
          textContent +
          "\n\n⚠️ Error: Could not process the form update. Please try again.",
        success: false,
      };
    }
  }

  /**
   * Extract relevant information from the current form
   */
  private extractFormInfo(currentForm: EditableForm): {
    name: string;
    fieldCount: number;
    fields: string[];
    structure: any;
  } {
    if (!currentForm) {
      return {
        name: "No form selected",
        fieldCount: 0,
        fields: [],
        structure: {},
      };
    }

    // Extract field information from form schema
    const fields = this.extractFieldNames(currentForm);

    return {
      name: currentForm.name || currentForm.formId || "Unnamed Form",
      fieldCount: fields.length,
      fields,
      structure: {
        // Simplified structure - could be enhanced based on actual form structure
        type: "form",
        fields: fields,
        metadata: {},
      },
    };
  }

  /**
   * Extract field names from form structure using visitor pattern
   */
  private extractFieldNames(form: EditableForm): string[] {
    const fields: string[] = [];

    try {
      // Get root definitions from the form tree
      const rootDefinitions = form.formTree.getRootDefinitions().value;

      // Use visitor pattern to extract field names
      for (const definition of rootDefinitions) {
        this.extractFieldNamesFromDefinition(definition, fields);
      }
    } catch (error) {
      console.warn("Could not extract field names:", error);
    }

    return fields;
  }

  /**
   * Extract field names from a single control definition using visitor pattern
   */
  private extractFieldNamesFromDefinition(
    definition: ControlDefinition,
    fields: string[],
  ): void {
    // Create a field name extraction visitor
    const fieldNameVisitor: ControlVisitor<void> = {
      data: (d: DataControlDefinition) => {
        if (d.field) {
          fields.push(d.field);
        }
      },
      group: (g: GroupedControlsDefinition) => {
        // Recursively process children in grouped controls
        if (g.children) {
          for (const child of g.children) {
            this.extractFieldNamesFromDefinition(child, fields);
          }
        }
      },
      display: (_d: DisplayControlDefinition) => {
        // Display controls don't have fields, so do nothing
      },
      action: (_a: ActionControlDefinition) => {
        // Action controls don't have fields, so do nothing
      },
    };

    // Use the visitor to process this definition
    visitControlDefinition(definition, fieldNameVisitor, (_def) => {
      // Default handler for unknown control types
      // Check if it has children and process them
      if ("children" in _def && Array.isArray(_def.children)) {
        for (const child of _def.children) {
          this.extractFieldNamesFromDefinition(child, fields);
        }
      }
    });
  }

  /**
   * Apply the updated form definition to the current form
   */
  async applyUpdatedFormDefinition(
    updatedFormDefinition: ControlDefinition[],
    currentForm: Control<EditableForm | undefined>,
    _context: ViewContext,
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate the updated form definition
      if (!Array.isArray(updatedFormDefinition)) {
        errors.push("Updated form definition must be an array");
        return { success: false, errors };
      }

      // Apply the updated form definition
      const formTree = currentForm.as<EditableForm>().value.formTree;
      const rootDefinitions = formTree.getRootDefinitions();

      // Replace the entire form definition
      rootDefinitions.setValue(() => updatedFormDefinition);

      console.log("Applied updated form definition:", updatedFormDefinition);

      return { success: true, errors: [] };
    } catch (error) {
      errors.push(
        `Error applying form definition: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return { success: false, errors };
    }
  }
}
