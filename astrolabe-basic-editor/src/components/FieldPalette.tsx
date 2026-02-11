import React from "react";
import { BasicFieldType } from "../types";
import { getAllFieldTypes, getFieldTypeConfig } from "../fieldTypes";
import { useBasicEditorContext } from "../BasicEditorContext";

export function FieldPalette() {
  const { addField } = useBasicEditorContext();

  return (
    <div className="w-60 border-r border-violet-100 bg-white overflow-y-auto flex-shrink-0">
      <div className="p-4">
        <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-[1px] mb-3 ml-1">
          Add Fields
        </h3>
        <div className="space-y-0.5">
          {getAllFieldTypes().map((type) => {
            const config = getFieldTypeConfig(type);
            return (
              <button
                key={type}
                onClick={() => addField(type)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-slate-600 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-2 transition-colors"
              >
                <span className="w-6 text-center text-violet-500 font-mono">
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
