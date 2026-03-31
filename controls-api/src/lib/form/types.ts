/**
 * Minimal form state types for the POC.
 * Subset of @astroapps/forms-core — just enough to test FormStateNode.
 */

import type { Control, ReadContext, ControlContext } from "../types";
import type { SubscriptionReconciler } from "../readContextImpl";

// ── Schema types ─────────────────────────────────────────────────────

export interface SchemaField {
  type: string;
  field: string;
  displayName?: string;
  collection?: boolean;
  onlyForTypes?: string[];
  isTypeField?: boolean;
  required?: boolean;
  children?: SchemaField[];
}

export const FieldType = {
  String: "String",
  Bool: "Bool",
  Int: "Int",
  Compound: "Compound",
  Any: "Any",
} as const;

export function isCompoundField(
  sf: SchemaField,
): sf is SchemaField & { children: SchemaField[] } {
  return sf.type === FieldType.Compound;
}

// ── Control definition types ─────────────────────────────────────────

export interface ControlDefinition {
  type: string;
  title?: string;
  hidden?: boolean | null;
  disabled?: boolean | null;
  readonly?: boolean | null;
  field?: string;
  required?: boolean;
  defaultValue?: any;
  children?: ControlDefinition[];
  compoundField?: string;
  dontClearHidden?: boolean;
}

export const ControlDefinitionType = {
  Data: "Data",
  Group: "Group",
} as const;

// ── SchemaDataNode ───────────────────────────────────────────────────

export interface SchemaDataNode {
  schema: SchemaField;
  control: Control<any>;
  parent?: SchemaDataNode;
  elementIndex?: number;
  getChild(field: string): SchemaDataNode;
  getChildElement(index: number): SchemaDataNode;
}

// ── FormStateNode state ──────────────────────────────────────────────

export interface FormStateNodeState {
  visible: boolean | null;
  disabled: boolean;
  readonly: boolean;
  dataNode: SchemaDataNode | undefined;
  children: FormStateNodeState[];
  childIndex: number;
}

// ── FormStateNode interface ──────────────────────────────────────────

export interface FormStateNode {
  readonly stateControl: Control<FormStateNodeState>;
  readonly definition: ControlDefinition;
  readonly parentNode: FormStateNode | undefined;

  /** Read the resolved definition (for now, just the static definition) */
  getDefinition(rc: ReadContext): ControlDefinition;

  /** Read state fields reactively */
  getState(rc: ReadContext): FormStateNodeState;

  /** Access children as FormStateNode[] */
  getChildren(rc: ReadContext): FormStateNode[];

  /** Cleanup all reactive bindings */
  cleanup(): void;
}

// ── FormStateNode options ────────────────────────────────────────────

export interface FormNodeOptions {
  forceReadonly?: boolean;
  forceDisabled?: boolean;
  forceHidden?: boolean;
}

export interface FormGlobalOptions {
  ctx: ControlContext;
  clearHidden: boolean;
  isEmptyValue?: (field: SchemaField, value: any) => boolean;
}
