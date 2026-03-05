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
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.5px] mb-2">
        Options
      </label>
      <div className="space-y-1.5">
        {optionsList.map((opt, i) => {
          const optControl = options.elements[i];
          return (
            <div key={i} className="flex items-center gap-1.5">
              <input
                className="flex-1 text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50/50 text-slate-800 focus:border-violet-500 focus:outline-none"
                value={opt.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const { name: nameField, value: valueField } = optControl.fields;
                  nameField.value = name;
                  valueField.value = toKebabCase(name);
                }}
                placeholder="Option name"
              />
              <button
                onClick={() => removeElement(options, optControl)}
                className="text-slate-400 hover:text-red-500 px-1 text-sm transition-colors"
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
        className="mt-2 text-[12.5px] text-violet-600 border border-dashed border-violet-300 rounded-lg px-3 py-1.5 hover:bg-violet-50 hover:border-violet-500 transition-colors"
      >
        + Add option
      </button>
    </div>
  );
}
