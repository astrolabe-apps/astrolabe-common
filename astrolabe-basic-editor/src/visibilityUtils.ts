import {
  DynamicProperty,
  DynamicPropertyType,
  ExpressionType,
  DataMatchExpression,
  JsonataExpression,
  dynamicVisibility,
  dataMatchExpr,
  jsonataExpr,
} from "@react-typed-forms/schemas";
import { SimpleVisibilityCondition } from "./types";

export function readVisibilityCondition(
  dynamic: DynamicProperty[] | null | undefined,
): SimpleVisibilityCondition | undefined {
  if (!dynamic) return undefined;
  const visEntry = dynamic.find(
    (d) => d.type === DynamicPropertyType.Visible,
  );
  if (!visEntry) return undefined;

  const expr = visEntry.expr;
  if (expr.type === ExpressionType.DataMatch) {
    const match = expr as DataMatchExpression;
    return {
      field: match.field,
      operator: "equals",
      value: match.value,
    };
  }
  if (expr.type === ExpressionType.Jsonata) {
    const jsonata = expr as JsonataExpression;
    const notEqualsMatch = jsonata.expression.match(
      /^(\w+)\s*!=\s*"([^"]*)"$/,
    );
    if (notEqualsMatch) {
      return {
        field: notEqualsMatch[1],
        operator: "notEquals",
        value: notEqualsMatch[2],
      };
    }
    const notEqualsBoolMatch = jsonata.expression.match(
      /^(\w+)\s*!=\s*(true|false)$/,
    );
    if (notEqualsBoolMatch) {
      return {
        field: notEqualsBoolMatch[1],
        operator: "notEquals",
        value: notEqualsBoolMatch[2] === "true",
      };
    }
    const notEqualsNumMatch = jsonata.expression.match(
      /^(\w+)\s*!=\s*(\d+(?:\.\d+)?)$/,
    );
    if (notEqualsNumMatch) {
      return {
        field: notEqualsNumMatch[1],
        operator: "notEquals",
        value: Number(notEqualsNumMatch[2]),
      };
    }
  }
  return undefined;
}

export function writeVisibilityCondition(
  existing: DynamicProperty[] | null | undefined,
  condition: SimpleVisibilityCondition | undefined,
): DynamicProperty[] | null {
  const nonVisible = (existing ?? []).filter(
    (d) => d.type !== DynamicPropertyType.Visible,
  );
  if (!condition) {
    return nonVisible.length > 0 ? nonVisible : null;
  }
  const expr =
    condition.operator === "equals"
      ? dataMatchExpr(condition.field, condition.value)
      : jsonataExpr(
          typeof condition.value === "string"
            ? `${condition.field} != "${condition.value}"`
            : `${condition.field} != ${condition.value}`,
        );
  return [...nonVisible, dynamicVisibility(expr)];
}
