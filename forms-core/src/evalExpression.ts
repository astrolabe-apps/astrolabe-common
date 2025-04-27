import {
  DataExpression,
  DataMatchExpression,
  EntityExpression,
  ExpressionType,
  JsonataExpression,
  NotEmptyExpression,
} from "./entityExpression";
import {
  AsyncEffect,
  ChangeListenerFunc,
  CleanupScope,
  collectChange,
  collectChanges,
  Control,
  ControlChange,
  createAsyncEffect,
  createSyncEffect,
  trackedValue,
} from "@astroapps/controls";
import { schemaDataForFieldRef, SchemaDataNode } from "./schemaDataNode";
import { FormContextOptions } from "./formState";
import { SchemaInterface } from "./schemaInterface";
import jsonata from "jsonata";
import { getJsonPath, getRootDataNode } from "./controlDefinition";
import { v4 as uuidv4 } from "uuid";
import { createScopedComputed, jsonPathString } from "./util";

export interface ExpressionEvalContext {
  scope: CleanupScope;
  returnResult: (k: unknown) => void;
  dataNode: SchemaDataNode;
  formContext: Control<FormContextOptions>;
  schemaInterface: SchemaInterface;
}

export type ExpressionEval<T extends EntityExpression> = (
  expr: T,
  context: ExpressionEvalContext,
) => void;

const dataEval: ExpressionEval<DataExpression> = (
  fvExpr,
  { dataNode: node, returnResult, scope },
) => {
  createSyncEffect(() => {
    const otherField = schemaDataForFieldRef(fvExpr.field, node);
    returnResult(otherField.control?.value);
  }, scope);
};
const dataMatchEval: ExpressionEval<DataMatchExpression> = (
  matchExpr,
  { dataNode, returnResult, scope },
) => {
  createSyncEffect(() => {
    const otherField = schemaDataForFieldRef(matchExpr.field, dataNode);
    const fv = otherField?.control.value;
    returnResult(
      Array.isArray(fv) ? fv.includes(matchExpr.value) : fv === matchExpr.value,
    );
  }, scope);
};

const notEmptyEval: ExpressionEval<NotEmptyExpression> = (
  expr,
  { returnResult, dataNode, scope, schemaInterface },
) => {
  createSyncEffect(() => {
    const otherField = schemaDataForFieldRef(expr.field, dataNode);
    const fv = otherField.control?.value;
    const field = otherField.schema.field;
    returnResult(field && !schemaInterface.isEmptyValue(field, fv));
  }, scope);
};

export const jsonataEval: ExpressionEval<JsonataExpression> = (
  expr,
  { scope, returnResult, dataNode },
) => {
  const path = getJsonPath(dataNode);
  const pathString = jsonPathString(path, (x) => `#$i[${x}]`);
  const rootData = getRootDataNode(dataNode).control;

  const parsedJsonata = createScopedComputed(scope, () => {
    const jExpr = expr.expression;
    const fullExpr = pathString ? pathString + ".(" + jExpr + ")" : jExpr;
    try {
      return { expr: jsonata(fullExpr ? fullExpr : "null"), fullExpr };
    } catch (e) {
      console.error(e);
      return { expr: jsonata("null"), fullExpr };
    }
  });

  async function runJsonata(effect: AsyncEffect<any>, signal: AbortSignal) {
    const evalResult = await parsedJsonata.fields.expr.value.evaluate(
      trackedValue(rootData, effect.collectUsage),
    );
    collectChanges(effect.collectUsage, () => returnResult(evalResult));
  }

  createAsyncEffect(runJsonata, scope);
};

export const uuidEval: ExpressionEval<EntityExpression> = (_, ctx) => {
  ctx.returnResult(uuidv4());
};

export const defaultEvaluators: Record<string, ExpressionEval<any>> = {
  [ExpressionType.DataMatch]: dataMatchEval,
  [ExpressionType.Data]: dataEval,
  [ExpressionType.NotEmpty]: notEmptyEval,
  [ExpressionType.Jsonata]: jsonataEval,
  [ExpressionType.UUID]: uuidEval,
};
