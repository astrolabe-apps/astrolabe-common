import React, { createContext, useContext } from "react";
import { Control } from "@react-typed-forms/core";
import { FormRenderer } from "@react-typed-forms/schemas";
import { BasicEditorState, BasicFieldType } from "./types";

export interface BasicEditorContextValue {
  state: Control<BasicEditorState>;
  formRenderer: FormRenderer;
  addField: (type: BasicFieldType) => void;
  deleteField: (fieldId: string) => void;
  selectField: (fieldId: string | undefined) => void;
}

const BasicEditorCtx = createContext<BasicEditorContextValue | null>(null);

export function BasicEditorProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: BasicEditorContextValue;
}) {
  return (
    <BasicEditorCtx.Provider value={value}>
      {children}
    </BasicEditorCtx.Provider>
  );
}

export function useBasicEditorContext(): BasicEditorContextValue {
  const ctx = useContext(BasicEditorCtx);
  if (!ctx) {
    throw new Error(
      "useBasicEditorContext must be used within a BasicEditorProvider",
    );
  }
  return ctx;
}
