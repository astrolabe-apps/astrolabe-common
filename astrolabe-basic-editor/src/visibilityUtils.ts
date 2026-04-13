import {
  DynamicPropertyType,
  ExpressionType,
  DataMatchExpression,
  JsonataExpression,
  EntityExpression,
  NotExpression,
  dataMatchExpr,
  jsonataExpr,
  notExpr,
  ControlDefinition,
} from "@react-typed-forms/schemas";
import { SimpleVisibilityCondition } from "./types";

function readVisibilityExpr(
  expr: EntityExpression,
): SimpleVisibilityCondition | undefined {
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

export function readVisibilityCondition(
  def: ControlDefinition,
): SimpleVisibilityCondition | undefined {
  // Check $scripts.hidden first (wrapped in Not)
  const hiddenExpr = (def as any)["$scripts"]?.["hidden"];
  if (hiddenExpr) {
    if (hiddenExpr.type === ExpressionType.Not) {
      return readVisibilityExpr((hiddenExpr as NotExpression).innerExpression);
    }
    return undefined;
  }

  // Fall back to legacy dynamic
  if (!def.dynamic) return undefined;
  const visEntry = def.dynamic.find(
    (d) => d.type === DynamicPropertyType.Visible,
  );
  if (!visEntry) return undefined;
  return readVisibilityExpr(visEntry.expr);
}

function buildVisibilityExpr(
  condition: SimpleVisibilityCondition,
): EntityExpression {
  return condition.operator === "equals"
    ? dataMatchExpr(condition.field, condition.value)
    : jsonataExpr(
        typeof condition.value === "string"
          ? `${condition.field} != "${condition.value}"`
          : `${condition.field} != ${condition.value}`,
      );
}

export function writeVisibilityCondition(
  def: ControlDefinition,
  condition: SimpleVisibilityCondition | undefined,
): Pick<ControlDefinition, "dynamic"> & {
  $scripts?: Record<string, EntityExpression>;
} {
  // Remove legacy dynamic Visible entries
  const nonVisible = (def.dynamic ?? []).filter(
    (d) => d.type !== DynamicPropertyType.Visible,
  );
  const cleanDynamic = nonVisible.length > 0 ? nonVisible : null;

  // Build new $scripts, removing hidden if no condition
  const { hidden, ...otherScripts } = (def as any)["$scripts"] ?? {};
  const newScripts = condition
    ? { ...otherScripts, hidden: notExpr(buildVisibilityExpr(condition)) }
    : Object.keys(otherScripts).length > 0
      ? otherScripts
      : undefined;

  return { dynamic: cleanDynamic, $scripts: newScripts };
}
