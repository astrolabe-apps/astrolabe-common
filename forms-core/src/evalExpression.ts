import {
  DataExpression,
  DataMatchExpression,
  EntityExpression,
  ExpressionType,
} from "./entityExpression";
import { Control, updateComputedValue } from "@astroapps/controls";
import { schemaDataForFieldRef, SchemaDataNode } from "./schemaDataNode";
import { FormNode } from "./formNode";
import { FormContextOptions } from "./formState";

export interface ExpressionEvalContext {
  coerce: (k: unknown) => unknown;
  dataNode: SchemaDataNode;
  formContext: Control<FormContextOptions>;
}

export type ExpressionEval<T extends EntityExpression> = (
  expr: T,
  result: Control<any>,
  context: ExpressionEvalContext,
) => void;

const dataEval: ExpressionEval<DataExpression> = (
  fvExpr,
  result,
  { dataNode: node, coerce },
) => {
  updateComputedValue(result, () => {
    const otherField = schemaDataForFieldRef(fvExpr.field, node);
    return coerce(otherField.control?.value);
  });
};
const dataMatchEval: ExpressionEval<DataMatchExpression> = (
  matchExpr,
  result,
  { dataNode, coerce },
) => {
  updateComputedValue(result, () => {
    const otherField = schemaDataForFieldRef(matchExpr.field, dataNode);
    const fv = otherField?.control.value;
    return coerce(
      Array.isArray(fv) ? fv.includes(matchExpr.value) : fv === matchExpr.value,
    );
  });
};

export const defaultEvaluators: Record<string, ExpressionEval<any>> = {
  [ExpressionType.DataMatch]: dataMatchEval,
  [ExpressionType.Data]: dataEval,
};
