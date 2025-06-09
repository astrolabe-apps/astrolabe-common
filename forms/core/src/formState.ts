import { FormNode } from "./formNode";
import { SchemaDataNode } from "./schemaDataNode";
import { SchemaInterface } from "./schemaInterface";
import { FieldOption } from "./schemaField";
import {
  ChangeListenerFunc,
  CleanupScope,
  Control,
  createScopedEffect,
  ensureMetaValue,
  getControlPath,
  getCurrentFields,
  getMetaValue,
  newControl,
  unsafeRestoreControl,
} from "@astroapps/controls";
import {
  defaultEvaluators,
  ExpressionEval,
  ExpressionEvalContext,
} from "./evalExpression";
import { EntityExpression } from "./entityExpression";
import { createScoped, jsonPathString } from "./util";
import {
  createFormStateNode,
  FormContextOptions,
  FormStateNode,
} from "./evaluateForm";
import { ControlDefinition } from "./controlDefinition";

/**
 * Interface representing the form context data.
 */
export interface FormContextData {
  option?: FieldOption;
  optionSelected?: boolean;
}
