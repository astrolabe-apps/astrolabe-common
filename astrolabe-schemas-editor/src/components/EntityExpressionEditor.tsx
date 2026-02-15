import React, { Fragment, ReactNode } from "react";
import {
  EntityExpression,
  ExpressionType,
  JsonataExpression,
  DataExpression,
  DataMatchExpression,
  NotEmptyExpression,
  UserMatchExpression,
  NotExpression,
  SchemaField,
} from "@react-typed-forms/schemas";

const expressionTypes: { value: string; label: string }[] = [
  { value: "", label: "(None)" },
  { value: ExpressionType.Jsonata, label: "Jsonata" },
  { value: ExpressionType.Data, label: "Data" },
  { value: ExpressionType.DataMatch, label: "Field Value" },
  { value: ExpressionType.NotEmpty, label: "Not Empty" },
  { value: ExpressionType.UserMatch, label: "User Match" },
  { value: ExpressionType.UUID, label: "UUID" },
  { value: ExpressionType.Not, label: "Not" },
];

const selectStyle: React.CSSProperties = {
  padding: "2px 4px",
  fontSize: "12px",
  border: "1px solid #ccc",
  borderRadius: "3px",
};

const inputStyle: React.CSSProperties = {
  padding: "2px 4px",
  fontSize: "12px",
  border: "1px solid #ccc",
  borderRadius: "3px",
  width: "100%",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "60px",
  fontFamily: "monospace",
  resize: "vertical",
};

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  fontSize: "12px",
};

export interface EntityExpressionEditorProps {
  value: EntityExpression | undefined;
  onChange: (expr: EntityExpression | undefined) => void;
  allFields: SchemaField[];
}

export function EntityExpressionEditor({
  value,
  onChange,
  allFields,
}: EntityExpressionEditorProps) {
  const currentType = value?.type ?? "";

  function handleTypeChange(newType: string) {
    if (!newType) {
      onChange(undefined);
      return;
    }
    onChange(defaultExpressionForType(newType));
  }

  return (
    <div style={containerStyle}>
      <select
        style={selectStyle}
        value={currentType}
        onChange={(e) => handleTypeChange(e.target.value)}
      >
        {expressionTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      {value && renderExpressionFields(value, onChange, allFields)}
    </div>
  );
}

function defaultExpressionForType(type: string): EntityExpression {
  switch (type) {
    case ExpressionType.Jsonata:
      return { type, expression: "" } as JsonataExpression;
    case ExpressionType.Data:
      return { type, field: "" } as DataExpression;
    case ExpressionType.DataMatch:
      return { type, field: "", value: "" } as DataMatchExpression;
    case ExpressionType.NotEmpty:
      return { type, field: "" } as NotEmptyExpression;
    case ExpressionType.UserMatch:
      return { type, userMatch: "" } as UserMatchExpression;
    case ExpressionType.Not:
      return {
        type,
        expression: { type: ExpressionType.Jsonata, expression: "" },
      } as NotExpression;
    case ExpressionType.UUID:
      return { type };
    default:
      return { type };
  }
}

function renderExpressionFields(
  expr: EntityExpression,
  onChange: (expr: EntityExpression) => void,
  allFields: SchemaField[],
): ReactNode {
  switch (expr.type) {
    case ExpressionType.Jsonata: {
      const je = expr as JsonataExpression;
      return (
        <textarea
          style={textareaStyle}
          value={je.expression}
          placeholder="Jsonata expression..."
          onChange={(e) =>
            onChange({ ...je, expression: e.target.value } as JsonataExpression)
          }
        />
      );
    }
    case ExpressionType.Data: {
      const de = expr as DataExpression;
      return (
        <FieldSelect
          value={de.field}
          allFields={allFields}
          onChange={(field) => onChange({ ...de, field } as DataExpression)}
        />
      );
    }
    case ExpressionType.DataMatch: {
      const dm = expr as DataMatchExpression;
      return (
        <>
          <FieldSelect
            value={dm.field}
            allFields={allFields}
            onChange={(field) =>
              onChange({ ...dm, field } as DataMatchExpression)
            }
          />
          <input
            style={inputStyle}
            value={dm.value ?? ""}
            placeholder="Match value..."
            onChange={(e) =>
              onChange({ ...dm, value: e.target.value } as DataMatchExpression)
            }
          />
        </>
      );
    }
    case ExpressionType.NotEmpty: {
      const ne = expr as NotEmptyExpression;
      return (
        <>
          <FieldSelect
            value={ne.field}
            allFields={allFields}
            onChange={(field) =>
              onChange({ ...ne, field } as NotEmptyExpression)
            }
          />
          <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="checkbox"
              checked={!!ne.empty}
              onChange={(e) =>
                onChange({ ...ne, empty: e.target.checked } as NotEmptyExpression)
              }
            />
            <span>Empty (invert)</span>
          </label>
        </>
      );
    }
    case ExpressionType.UserMatch: {
      const um = expr as UserMatchExpression;
      return (
        <input
          style={inputStyle}
          value={um.userMatch}
          placeholder="User match value..."
          onChange={(e) =>
            onChange({
              ...um,
              userMatch: e.target.value,
            } as UserMatchExpression)
          }
        />
      );
    }
    case ExpressionType.Not: {
      const ne = expr as NotExpression;
      return (
        <div style={{ paddingLeft: "8px", borderLeft: "2px solid #ddd" }}>
          <EntityExpressionEditor
            value={ne.expression}
            onChange={(inner) =>
              onChange({
                ...ne,
                expression: inner ?? ({
                  type: ExpressionType.Jsonata,
                  expression: "",
                } as JsonataExpression),
              } as NotExpression)
            }
            allFields={allFields}
          />
        </div>
      );
    }
    case ExpressionType.UUID:
      return null;
    default:
      return null;
  }
}

function FieldSelect({
  value,
  allFields,
  onChange,
}: {
  value: string;
  allFields: SchemaField[];
  onChange: (field: string) => void;
}) {
  return (
    <select
      style={selectStyle}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">(Select field)</option>
      {allFields.map((f) => (
        <option key={f.field} value={f.field}>
          {f.displayName || f.field}
        </option>
      ))}
    </select>
  );
}
