import React from "react";
import { ControlDefinition } from "@react-typed-forms/schemas";
import { ChatInterface, AgentCommand } from "./ChatInterface";
import { DiffViewer, JsonDiff } from "./DiffViewer";

interface AgentAssistPanelProps {
  onChangesProposed: (proposedControls: ControlDefinition[]) => void;
  pendingChanges: ControlDefinition[] | null;
  currentControls: ControlDefinition[];
  diff: JsonDiff | null;
  onApprove: () => void;
  onReject: () => void;
  commandHistory: AgentCommand[];
  isProcessing: boolean;
  onSendCommand: (command: string) => Promise<void>;
  onClearHistory: () => void;
  currentFormName: string;
}

export function AgentAssistPanel({
  onChangesProposed,
  pendingChanges,
  currentControls,
  diff,
  onApprove,
  onReject,
  commandHistory,
  isProcessing,
  onSendCommand,
  onClearHistory,
  currentFormName
}: AgentAssistPanelProps) {
  return (
    <div className="agent-assist-panel bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col h-full">
      <div className="panel-header mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          🤖 Agent Assistant
        </h3>
      </div>

      <div className="chat-section flex-1 mb-4">
        <ChatInterface
          commandHistory={commandHistory}
          isProcessing={isProcessing}
          onSendCommand={onSendCommand}
          onClearHistory={onClearHistory}
          currentFormName={currentFormName}
        />
      </div>

      {diff && pendingChanges && (
        <div className="diff-section">
          <DiffViewer
            diff={diff}
            oldControls={currentControls}
            newControls={pendingChanges}
            onApprove={onApprove}
            onReject={onReject}
          />
        </div>
      )}
    </div>
  );
}