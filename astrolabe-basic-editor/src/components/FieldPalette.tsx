import React from "react";
import { BasicFieldType } from "../types";
import { getAllFieldTypes, getFieldTypeConfig } from "../fieldTypes";
import { useBasicEditorContext } from "../BasicEditorContext";

export function FieldPalette() {
  const { addField } = useBasicEditorContext();

  return (
    <div className="w-60 border-r bg-white overflow-y-auto flex-shrink-0">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Add Fields
        </h3>
        <div className="space-y-1">
          {getAllFieldTypes().map((type) => {
            const config = getFieldTypeConfig(type);
            return (
              <button
                key={type}
                onClick={() => addField(type)}
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors"
              >
                <span className="w-6 text-center text-gray-500 font-mono">
                  {config.icon}
                </span>
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
