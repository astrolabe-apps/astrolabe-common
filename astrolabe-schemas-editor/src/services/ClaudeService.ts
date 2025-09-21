import { ViewContext, EditableForm, ConversationMessage } from "../types";
import { ControlDefinition, SchemaField } from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";

export interface ClaudeResponse {
  response: string;
  success: boolean;
  updatedFormDefinition?: ControlDefinition[];
}

interface ProcessCommandRequest {
  command: string;
  currentFormDefinition: ControlDefinition[];
  schema: SchemaField[];
  conversationHistory: ConversationMessage[];
  systemPrompt?: string;
}

interface StreamChunk {
  type: "chunk" | "tool_use" | "complete" | "error";
  content: string;
  toolCall?: any;
  error?: string;
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
   * Process an agent command using Claude with the new structured endpoint
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

      const currentFormDefinition = editableForm.formTree.getRootDefinitions().value;
      const conversationHistory = conversationHistoryControl?.value || [];

      // Get schema information
      let schema: SchemaField[] = [];
      try {
        schema = context.getSchemaForForm(formControl).getRootFields().value;
      } catch (error) {
        console.warn("Could not get schema for form:", error);
      }

      const request: ProcessCommandRequest = {
        command,
        currentFormDefinition,
        schema,
        conversationHistory
      };

      // Call the new structured endpoint
      const fetchResponse = await fetch(`${this.apiUrl}/process-command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`);
      }

      const response: ClaudeResponse = await fetchResponse.json();

      // Add user message to history using Control API
      const newUserMessage: ConversationMessage = {
        role: "user",
        content: command,
      };
      if (conversationHistoryControl) {
        conversationHistoryControl.setValue((prev) => [
          ...(prev || []),
          newUserMessage,
        ]);
      }

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
   * Process an agent command with streaming response
   */
  async processCommandStream(
    command: string,
    currentForm: Control<EditableForm | undefined>,
    context: ViewContext,
    onChunk: (chunk: string) => void,
    onComplete?: (response: ClaudeResponse) => void,
  ): Promise<void> {
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

      const currentFormDefinition = editableForm.formTree.getRootDefinitions().value;
      const conversationHistory = conversationHistoryControl?.value || [];

      // Get schema information
      let schema: SchemaField[] = [];
      try {
        schema = context.getSchemaForForm(formControl).getRootFields().value;
      } catch (error) {
        console.warn("Could not get schema for form:", error);
      }

      const request: ProcessCommandRequest = {
        command,
        currentFormDefinition,
        schema,
        conversationHistory
      };

      // Call the streaming endpoint
      const fetchResponse = await fetch(`${this.apiUrl}/stream-command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`);
      }

      const reader = fetchResponse.body?.getReader();
      const decoder = new TextDecoder();

      let accumulatedResponse = "";
      let toolCall: any = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Stream completed
                if (onComplete && toolCall) {
                  const response: ClaudeResponse = {
                    response: accumulatedResponse,
                    success: true,
                    updatedFormDefinition: toolCall.input?.form_definition
                  };
                  onComplete(response);
                }
                return;
              }

              try {
                const streamChunk: StreamChunk = JSON.parse(data);

                if (streamChunk.type === "chunk" && streamChunk.content) {
                  accumulatedResponse += streamChunk.content;
                  onChunk(streamChunk.content);
                } else if (streamChunk.type === "tool_use" && streamChunk.toolCall) {
                  toolCall = streamChunk.toolCall;
                } else if (streamChunk.type === "error") {
                  throw new Error(streamChunk.error || "Streaming error");
                }
              } catch (parseError) {
                console.warn("Failed to parse stream chunk:", data);
              }
            }
          }
        }
      }

      // Add messages to history
      if (conversationHistoryControl) {
        const newUserMessage: ConversationMessage = {
          role: "user",
          content: command,
        };
        const newAssistantMessage: ConversationMessage = {
          role: "assistant",
          content: accumulatedResponse,
        };

        conversationHistoryControl.setValue((prev) => [
          ...(prev || []),
          newUserMessage,
          newAssistantMessage,
        ]);
      }

    } catch (error) {
      console.error("Claude streaming error:", error);
      onChunk(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }


}
