import React from "react";
import {
  addElement,
  Control,
  removeElement,
} from "@react-typed-forms/core";
import { FieldOption } from "@react-typed-forms/schemas";

export interface OptionsEditorProps {
  options: Control<FieldOption[] | null | undefined>;
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OptionsEditor({ options }: OptionsEditorProps) {
  const optionsList = options.value ?? [];

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Options
      </label>
      <div className="space-y-1">
        {optionsList.map((opt, i) => {
          const optControl = options.elements[i];
          return (
            <div key={i} className="flex items-center gap-1">
              <input
                className="flex-1 text-sm border rounded px-2 py-1"
                value={opt.name}
                onChange={(e) => {
                  const name = e.target.value;
                  optControl.setValue((v) => ({
                    ...v,
                    name,
                    value: toKebabCase(name),
                  }));
                }}
                placeholder="Option name"
              />
              <button
                onClick={() => removeElement(options, optControl)}
                className="text-gray-400 hover:text-red-500 px-1 text-sm"
                title="Remove option"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          const idx = optionsList.length + 1;
          addElement(options, {
            name: `Option ${idx}`,
            value: `option${idx}`,
          });
        }}
        className="mt-2 text-sm text-blue-600 hover:text-blue-800"
      >
        + Add option
      </button>
    </div>
  );
}
