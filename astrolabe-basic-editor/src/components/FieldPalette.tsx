import React from "react";
import { BasicFieldType } from "../types";
import { getAllFieldTypes, getFieldTypeConfig } from "../fieldTypes";
import { FormNode } from "@react-typed-forms/schemas";

export interface FieldPaletteProps {
  addField: (type: BasicFieldType) => void;
  pageMode?: boolean;
  selectedField?: FormNode;
  rootNode?: FormNode;
}

export function FieldPalette({
  addField,
  pageMode,
  selectedField,
  rootNode,
}: FieldPaletteProps) {
  // In page mode, determine if we're at root level
  const atRootLevel =
    pageMode &&
    (!selectedField ||
      (rootNode && selectedField.parent?.id === rootNode.id));

  const fieldTypes = getAllFieldTypes().filter((type) => {
    if (!pageMode) return true;
    if (atRootLevel) {
      // At root level in page mode, only allow SectionHeader (pages)
      return type === BasicFieldType.SectionHeader;
    }
    // Inside a page, allow everything except SectionHeader (no nested pages)
    return type !== BasicFieldType.SectionHeader;
  });

  return (
    <div className="w-60 border-r border-violet-100 bg-white overflow-y-auto flex-shrink-0">
      <div className="p-4">
        <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-[1px] mb-3 ml-1">
          {atRootLevel ? "Add Pages" : "Add Fields"}
        </h3>
        <div className="space-y-0.5">
          {fieldTypes.map((type) => {
            const config = getFieldTypeConfig(type);
            const label = pageMode && type === BasicFieldType.SectionHeader ? "Page" : config.label;
            return (
              <button
                key={type}
                onClick={() => addField(type)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-slate-600 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-2 transition-colors"
              >
                <span className="w-6 text-center text-violet-500 font-mono">
                  {config.icon}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
