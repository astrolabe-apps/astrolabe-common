import React, { createContext, Fragment, useContext, useState } from "react";
import {
  appendMarkup,
  ControlDefinition,
  ControlDefinitionScriptFields,
  ControlLayoutProps,
  EntityExpression,
  getJsonPath,
  resolveSchemaPath,
  SchemaField,
} from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";
import { ControlDataContext } from "@react-typed-forms/schemas";
import { EntityExpressionEditor } from "./EntityExpressionEditor";

export interface ScriptEditContextValue {
  definitionControl: Control<ControlDefinition>;
  allFields: SchemaField[];
}

export const ScriptEditContext = createContext<
  ScriptEditContextValue | undefined
>(undefined);

const iconButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "0 2px",
  fontSize: "14px",
  lineHeight: 1,
  opacity: 0.6,
  verticalAlign: "middle",
  display: "inline-flex",
  alignItems: "center",
};

const iconButtonActiveStyle: React.CSSProperties = {
  ...iconButtonStyle,
  opacity: 1,
  color: "#2563eb",
};

const editorContainerStyle: React.CSSProperties = {
  padding: "4px 8px",
  marginTop: "2px",
  marginBottom: "4px",
  border: "1px solid #e5e7eb",
  borderRadius: "4px",
  backgroundColor: "#f9fafb",
};

function ScriptButton({ fieldPath }: { fieldPath: string }) {
  const ctx = useContext(ScriptEditContext);
  const [open, setOpen] = useState(false);
  if (!ctx) return null;

  const currentExpr = ctx.definitionControl.current.value.scripts?.[fieldPath] as
    | EntityExpression
    | undefined;
  const hasScript = !!currentExpr;

  return (
    <Fragment>
      <button
        type="button"
        style={hasScript ? iconButtonActiveStyle : iconButtonStyle}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={
          hasScript
            ? `Script: ${currentExpr.type} (click to edit)`
            : "Add script"
        }
      >
        {"\u{1D453}"}
      </button>
      {open && (
        <div style={editorContainerStyle}>
          <EntityExpressionEditor
            value={currentExpr}
            onChange={(expr) => {
              ctx.definitionControl.setValue((def) => {
                const newScripts = { ...def.scripts };
                if (expr) {
                  newScripts[fieldPath] = expr;
                } else {
                  delete newScripts[fieldPath];
                }
                const hasKeys = Object.keys(newScripts).length > 0;
                return {
                  ...def,
                  scripts: hasKeys ? newScripts : null,
                };
              });
            }}
            allFields={ctx.allFields}
          />
        </div>
      )}
    </Fragment>
  );
}

export function scriptAdjustLayout(
  context: ControlDataContext,
  layout: ControlLayoutProps,
): ControlLayoutProps {
  const dataNode = context.dataNode;
  if (!dataNode || !layout.label) return layout;

  const fieldPath = getJsonPath(dataNode).join(".");
  if (!resolveSchemaPath(fieldPath, ControlDefinitionScriptFields))
    return layout;

  const adornment = {
    priority: 0,
    apply: appendMarkup("labelEnd", <ScriptButton fieldPath={fieldPath} />),
  };
  return {
    ...layout,
    adornments: [...(layout.adornments ?? []), adornment],
  };
}
