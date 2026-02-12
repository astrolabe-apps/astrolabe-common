import React, { Fragment } from "react";
import { Control } from "@react-typed-forms/core";
import {
  ControlDefinition,
  DataControlDefinition,
  isDataControl,
  SchemaField,
} from "@react-typed-forms/schemas";
import { SimpleVisibilityCondition } from "../types";
import {
  readVisibilityCondition,
  writeVisibilityCondition,
} from "../visibilityUtils";

export interface VisibilityConditionEditorProps {
  definition: Control<ControlDefinition>;
  allFields: SchemaField[];
}

export function VisibilityConditionEditor({
  definition,
  allFields,
}: VisibilityConditionEditorProps) {
  const def = definition.value;
  const condition = readVisibilityCondition(def.dynamic);
  const dataFields = allFields.filter(
    (f) =>
      f.field !== (isDataControl(def) ? (def as DataControlDefinition).field : ""),
  );

  const selectedField = condition
    ? allFields.find((f) => f.field === condition.field)
    : undefined;
  const hasOptions = selectedField?.options && selectedField.options.length > 0;

  function updateCondition(c: SimpleVisibilityCondition | undefined) {
    const newDynamic = writeVisibilityCondition(def.dynamic, c);
    definition.setValue((d) => ({ ...d, dynamic: newDynamic }));
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.5px] mb-2">
        Visibility
      </label>
      <div className="space-y-2">
        <select
          className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50/50 text-slate-800 focus:border-violet-500 focus:outline-none"
          value={condition?.field ?? ""}
          onChange={(e) => {
            const field = e.target.value;
            if (!field) {
              updateCondition(undefined);
            } else {
              updateCondition({
                field,
                operator: condition?.operator ?? "equals",
                value: condition?.value ?? "",
              });
            }
          }}
        >
          <option value="">Always visible</option>
          {dataFields.map((f) => (
            <option key={f.field} value={f.field}>
              {f.displayName || f.field}
            </option>
          ))}
        </select>

        {condition && (
          <>
            <select
              className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50/50 text-slate-800 focus:border-violet-500 focus:outline-none"
              value={condition.operator}
              onChange={(e) =>
                updateCondition({
                  ...condition,
                  operator: e.target.value as "equals" | "notEquals",
                })
              }
            >
              <option value="equals">equals</option>
              <option value="notEquals">not equals</option>
            </select>

            {hasOptions ? (
              <select
                className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50/50 text-slate-800 focus:border-violet-500 focus:outline-none"
                value={String(condition.value ?? "")}
                onChange={(e) =>
                  updateCondition({ ...condition, value: e.target.value })
                }
              >
                <option value="">Select value...</option>
                {selectedField!.options!.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50/50 text-slate-800 focus:border-violet-500 focus:outline-none"
                value={String(condition.value ?? "")}
                onChange={(e) =>
                  updateCondition({ ...condition, value: e.target.value })
                }
                placeholder="Value"
              />
            )}

            <button
              onClick={() => updateCondition(undefined)}
              className="text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              Clear condition
            </button>
          </>
        )}
      </div>
    </div>
  );
}
