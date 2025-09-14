import React from "react";
import { useControl, Control } from "@react-typed-forms/core";
import clsx from "clsx";

export interface AgentCommand {
  id: string;
  command: string;
  response: string;
  timestamp: string; // ISO datetime string
  success: boolean;
}

interface ChatInterfaceProps {
  commandHistory: AgentCommand[];
  isProcessing: boolean;
  onSendCommand: (command: string) => Promise<void>;
  onClearHistory: () => void;
  currentFormName: string;
}

export function ChatInterface({
  commandHistory,
  isProcessing,
  onSendCommand,
  onClearHistory,
  currentFormName
}: ChatInterfaceProps) {
  const currentCommand = useControl<string>("");

  return (
    <div className="chat-interface flex flex-col h-full">
      {/* Current Form Status */}
      <div className="status-section bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
        <div className="mb-2">
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            📄 Current Form
          </label>
          <div className="text-sm bg-gray-50 px-3 py-2 rounded-md border font-mono text-gray-800">
            {currentFormName}
          </div>
        </div>
        <div className="mb-2">
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            ⚡ Status
          </label>
          <div className={clsx(
            "text-sm font-medium px-2 py-1 rounded-md",
            isProcessing ? "text-blue-600" : "text-green-600"
          )}>
            {isProcessing ? "🔄 Processing command..." : "✅ Ready"}
          </div>
        </div>
      </div>

      {/* Command Input */}
      <div className="command-input-section bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-3">🤖 Command Interface</h3>
        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Enter Command
          </label>
          <textarea
            value={currentCommand.value}
            onChange={(e) => currentCommand.value = e.target.value}
            placeholder="e.g., 'add text field named email' or 'make all fields required'"
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
            rows={2}
            disabled={isProcessing}
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleExecuteCommand}
            disabled={isProcessing || !currentCommand.value.trim()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isProcessing ? "Processing..." : "Execute"}
          </button>
        </div>
      </div>

      {/* Command History */}
      {commandHistory.length > 0 && (
        <div className="command-history-section bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex-1">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">📚 Command History</h3>
            <button
              onClick={onClearHistory}
              className="inline-flex items-center px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-md transition-colors duration-200"
            >
              Clear History
            </button>
          </div>
          <div className="bg-white border rounded-lg shadow-sm max-h-64 overflow-y-auto p-3 space-y-3">
            {commandHistory.map((cmd) => (
              <CommandHistoryItem key={cmd.id} command={cmd} />
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="help-section">
        <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <summary className="cursor-pointer font-medium text-gray-700 mb-2">
            💡 Available Commands
          </summary>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="font-medium">Field Operations:</div>
            <div>• "add text field named email" - Add new text input field</div>
            <div>• "add number field named age" - Add numeric input field</div>
            <div>• "add checkbox field named subscribe" - Add checkbox field</div>
            <div>• "remove field fieldname" - Remove existing field</div>
            <div>• "rename field oldname to newname" - Rename field</div>
            <div className="font-medium mt-3">Validation & Properties:</div>
            <div>• "make field email required" - Make specific field required</div>
            <div>• "make all fields required" - Make all fields required</div>
            <div>• "add email validation to field email" - Add email validation</div>
            <div className="font-medium mt-3">Structure:</div>
            <div>• "add section called Personal Info" - Create new grouped section</div>
            <div>• "move field name to section Personal Info" - Move field to section</div>
          </div>
        </details>
      </div>
    </div>
  );

  async function handleExecuteCommand() {
    const command = currentCommand.value.trim();
    if (!command) return;

    await onSendCommand(command);
    currentCommand.value = "";
  }
}

interface CommandHistoryItemProps {
  command: AgentCommand;
}

function CommandHistoryItem({ command }: CommandHistoryItemProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
      <div className="w-20 flex-shrink-0">
        <div className="text-xs text-gray-500 font-mono">
          {formatTime(command.timestamp)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-blue-700 truncate mb-1">
          {command.command}
        </div>
        <div className="text-sm text-gray-700">
          {command.response}
        </div>
      </div>
      <div className="w-8 flex-shrink-0 text-lg text-center">
        {command.success ? '✅' : '❌'}
      </div>
    </div>
  );
}