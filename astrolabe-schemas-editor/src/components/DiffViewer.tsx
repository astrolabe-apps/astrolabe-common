import React, { useMemo } from "react";
import { ControlDefinition } from "@react-typed-forms/schemas";
import clsx from "clsx";
import * as jsondiffpatch from "jsondiffpatch";

export interface JsonDiff {
  delta: any;
  hasChanges: boolean;
}

interface DiffViewerProps {
  diff: JsonDiff;
  oldControls: ControlDefinition[];
  newControls: ControlDefinition[];
  onApprove: () => void;
  onReject: () => void;
}

export function DiffViewer({ diff, oldControls, newControls, onApprove, onReject }: DiffViewerProps) {
  if (!diff.hasChanges) {
    return (
      <div className="diff-viewer bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-center text-gray-500 py-8">
          No changes detected
        </div>
      </div>
    );
  }

  return (
    <div className="diff-viewer bg-white border border-gray-200 rounded-lg p-4">
      <div className="diff-header flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Proposed Changes</h3>
        <div className="diff-actions flex gap-2">
          <button
            onClick={onApprove}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Apply Changes
          </button>
          <button
            onClick={onReject}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Reject Changes
          </button>
        </div>
      </div>

      <div className="diff-content bg-gray-50 rounded-lg p-4 font-mono text-sm">
        <DeltaRenderer delta={diff.delta} path="Controls" />
      </div>
    </div>
  );
}

interface DeltaRendererProps {
  delta: any;
  path: string;
  level?: number;
}

function DeltaRenderer({ delta, path, level = 0 }: DeltaRendererProps) {
  if (!delta || typeof delta !== 'object') {
    return null;
  }

  const indentClass = level === 0 ? '' : `ml-${Math.min(level * 4, 16)}`;

  return (
    <div className={indentClass}>
      {Object.entries(delta).map(([key, value]) => (
        <DeltaEntry key={key} deltaKey={key} deltaValue={value} path={path} level={level} />
      ))}
    </div>
  );
}

interface DeltaEntryProps {
  deltaKey: string;
  deltaValue: any;
  path: string;
  level: number;
}

function DeltaEntry({ deltaKey, deltaValue, path, level }: DeltaEntryProps) {
  const currentPath = path ? `${path}[${deltaKey}]` : deltaKey;

  // Array index (numeric key)
  const arrayIndex = parseInt(deltaKey, 10);
  const isArrayIndex = !isNaN(arrayIndex);

  if (Array.isArray(deltaValue)) {
    return <ArrayDelta deltaKey={deltaKey} deltaValue={deltaValue} path={currentPath} level={level} isArrayIndex={isArrayIndex} />;
  }

  if (typeof deltaValue === 'object') {
    return (
      <div className="mb-2">
        <div className="text-blue-700 font-semibold mb-1">
          {isArrayIndex ? `Item ${arrayIndex}` : `${currentPath}.${deltaKey}`}
        </div>
        <DeltaRenderer delta={deltaValue} path={currentPath} level={level + 1} />
      </div>
    );
  }

  return null;
}

interface ArrayDeltaProps {
  deltaKey: string;
  deltaValue: any[];
  path: string;
  level: number;
  isArrayIndex: boolean;
}

function ArrayDelta({ deltaKey, deltaValue, path, level, isArrayIndex }: ArrayDeltaProps) {
  const arrayIndex = parseInt(deltaKey, 10);

  if (deltaValue.length === 1) {
    // Addition: [newValue]
    return (
      <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-400 rounded">
        <div className="text-green-800 font-semibold mb-2 flex items-center">
          <span className="text-green-600 mr-2">➕</span>
          {isArrayIndex ? `Added Item ${arrayIndex}` : `Added ${deltaKey}`}
        </div>
        <ValueRenderer value={deltaValue[0]} />
      </div>
    );
  }

  if (deltaValue.length === 2) {
    // Modification: [oldValue, newValue]
    return (
      <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <div className="text-yellow-800 font-semibold mb-2 flex items-center">
          <span className="text-yellow-600 mr-2">🔄</span>
          {isArrayIndex ? `Modified Item ${arrayIndex}` : `Modified ${deltaKey}`}
        </div>
        <div className="space-y-2">
          <div>
            <div className="text-red-600 text-xs font-medium mb-1">FROM:</div>
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <ValueRenderer value={deltaValue[0]} />
            </div>
          </div>
          <div>
            <div className="text-green-600 text-xs font-medium mb-1">TO:</div>
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <ValueRenderer value={deltaValue[1]} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (deltaValue.length === 3 && deltaValue[2] === 0) {
    // Deletion: [oldValue, 0, 0]
    return (
      <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-400 rounded">
        <div className="text-red-800 font-semibold mb-2 flex items-center">
          <span className="text-red-600 mr-2">➖</span>
          {isArrayIndex ? `Removed Item ${arrayIndex}` : `Removed ${deltaKey}`}
        </div>
        <ValueRenderer value={deltaValue[0]} />
      </div>
    );
  }

  return null;
}

interface ValueRendererProps {
  value: any;
}

function ValueRenderer({ value }: ValueRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-gray-500 italic">null</span>;
  }

  if (typeof value === 'string') {
    return <span className="text-green-700">"{value}"</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-blue-700">{value}</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="text-purple-700">{value.toString()}</span>;
  }

  if (typeof value === 'object') {
    // For complex objects, show a formatted JSON preview
    try {
      const formatted = JSON.stringify(value, null, 2);
      const lines = formatted.split('\n');

      if (lines.length > 10) {
        // Truncate large objects
        const truncated = lines.slice(0, 10).join('\n') + '\n  ... (truncated)';
        return (
          <pre className="text-gray-700 text-xs bg-white p-2 border rounded overflow-x-auto">
            {truncated}
          </pre>
        );
      }

      return (
        <pre className="text-gray-700 text-xs bg-white p-2 border rounded overflow-x-auto">
          {formatted}
        </pre>
      );
    } catch (error) {
      return <span className="text-red-500">Error displaying object</span>;
    }
  }

  return <span className="text-gray-700">{String(value)}</span>;
}

// Utility function to calculate diff between two control definition arrays using jsondiffpatch
export function calculateJsonDiff(
  oldControls: ControlDefinition[],
  newControls: ControlDefinition[]
): JsonDiff {
  // Create jsondiffpatch instance
  const diffInstance = jsondiffpatch.create({
    objectHash: (obj: any) => {
      // Create a stable hash for control objects to help jsondiffpatch match them correctly
      if (obj && typeof obj === 'object' && obj.type) {
        if (obj.type === 'Data' && obj.field) {
          return `data-${obj.field}`;
        }
        if (obj.type === 'Group' && obj.title) {
          return `group-${obj.title}`;
        }
        if (obj.type === 'Action' && obj.actionId) {
          return `action-${obj.actionId}`;
        }
      }
      return JSON.stringify(obj);
    }
  });

  // Calculate the diff using jsondiffpatch
  const delta = diffInstance.diff(oldControls, newControls);

  return {
    delta,
    hasChanges: !!delta
  };
}

