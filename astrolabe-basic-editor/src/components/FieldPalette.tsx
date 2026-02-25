import React from "react";
import { BasicFieldType } from "../types";
import { getAllFieldTypes, getFieldTypeConfig } from "../fieldTypes";
import { FormNode, isGroupControl } from "@react-typed-forms/schemas";

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
  // In page mode, determine if we're inside a page:
  // either selected is a child of a page, or selected IS a page (root-level group)
  const insidePage =
    pageMode &&
    selectedField &&
    rootNode &&
    (selectedField.parent?.id !== rootNode.id ||
      isGroupControl(selectedField.definition));

  const fieldTypes = getAllFieldTypes().filter((type) => {
    if (type === BasicFieldType.Page) return !!pageMode;
    if (!pageMode) return true;
    // Page mode: field types only available when inside a page
    return !!insidePage;
  });

  return (
    <div className="w-60 border-r border-violet-100 bg-white overflow-y-auto flex-shrink-0">
      <div className="p-4">
        <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-[1px] mb-3 ml-1">
          {pageMode && !insidePage ? "Add Pages" : "Add Fields"}
        </h3>
        <div className="space-y-0.5">
          {fieldTypes.map((type) => {
            const config = getFieldTypeConfig(type);
            const label = config.label;
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
