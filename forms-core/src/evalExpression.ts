import {
  DataMatchExpression,
  EntityExpression,
  ExpressionType,
} from "./entityExpression";
import { Control, updateComputedValue } from "@astroapps/controls";
import { schemaDataForFieldRef, SchemaDataNode } from "./schemaDataNode";
import { FormNode } from "./formNode";
import { FormContextOptions } from "./formState";

export function evalExpression<T>(
  result: Control<T>,
  expr: EntityExpression,
  coerce: (k: unknown) => T,
  parent: SchemaDataNode,
  formNode: FormNode,
  context: Control<FormContextOptions>,
) {
  switch (expr.type) {
    case ExpressionType.DataMatch:
      const fvExpr = expr as DataMatchExpression;
      updateComputedValue(result, () => {
        const otherField = schemaDataForFieldRef(fvExpr.field, parent);
        const fv = otherField?.control.value;
        return coerce(
          Array.isArray(fv) ? fv.includes(fvExpr.value) : fv === fvExpr.value,
        );
      });
      break;
    default:
      console.log(expr);
  }
}
