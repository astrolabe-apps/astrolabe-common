import {
  CleanupScope,
  Control,
  createScopedEffect,
  updateComputedValue,
} from "@astroapps/controls";
import { isCompoundField, SchemaTags } from "./schemaField";
import { SchemaNode } from "./schemaNode";
import { createOverrideProxy } from "./overrideProxy";
import { createScoped } from "./util";
import { EntityExpression } from "./entityExpression";
import { coerceForFieldType, hasSchemaTag } from "./controlDefinitionSchemas";

export type EvalExpr = <A>(
  scope: CleanupScope,
  init: A,
  nk: Control<A>,
  e: EntityExpression | undefined,
  coerce: (t: unknown) => any,
) => boolean;

export type ScriptProvider = (
  target: any,
  path: string,
) => Record<string, EntityExpression>;

export const defaultScriptProvider: ScriptProvider = (target) =>
  target?.["$scripts"] ?? {};

interface OverrideLevel {
  overrides: Control<Record<string, any>>;
  children: Map<string, OverrideLevel>;
}

/**
 * Recursively create override controls for non-collection compound fields.
 */
function buildOverrideLevels(
  schemaNode: SchemaNode,
  scope: CleanupScope,
): OverrideLevel {
  const overrides = createScoped<Record<string, any>>(scope, {});
  const children = new Map<string, OverrideLevel>();
  const resolved = schemaNode.getResolvedFields();
  for (const field of resolved) {
    if (
      isCompoundField(field) &&
      field.children?.length > 0 &&
      !field.collection
    ) {
      children.set(
        field.field,
        buildOverrideLevels(schemaNode.createChildNode(field), scope),
      );
    }
  }
  return { overrides, children };
}

/**
 * Evaluate `$scripts` entries from a target against the given override level and schema.
 * Also handles ScriptNullInit fields that have no script.
 */
function evaluateScripts(
  target: any,
  level: OverrideLevel,
  schemaNode: SchemaNode,
  evalExpr: EvalExpr,
  getScripts: ScriptProvider,
  path: string,
): void {
  const scripts: Record<string, EntityExpression> = getScripts(target, path);
  const resolvedFields = schemaNode.getResolvedFields();

  const scriptedKeys = new Set<string>();

  for (const [key, expr] of Object.entries(scripts)) {
    const field = resolvedFields.find((f) => f.field === key);
    if (!field) continue;

    scriptedKeys.add(key);
    const coerce = coerceForFieldType(field.type);
    const targetField = (
      level.overrides.fields as Record<string, Control<any>>
    )[key];

    const nullInit = hasSchemaTag(field, SchemaTags.ScriptNullInit);
    const staticValue = target?.[key];
    const initValue = nullInit ? staticValue : coerce(staticValue ?? undefined);

    createScopedEffect((c) => {
      evalExpr(c, initValue, targetField, expr, coerce);
    }, level.overrides);
  }

  // For ScriptNullInit fields with no script, init the override to the coerced
  // static value so the proxy doesn't fall through to raw undefined/null.
  for (const field of resolvedFields) {
    if (
      hasSchemaTag(field, SchemaTags.ScriptNullInit) &&
      !scriptedKeys.has(field.field)
    ) {
      const coerce = coerceForFieldType(field.type);
      const staticValue = target?.[field.field];
      const targetField = (
        level.overrides.fields as Record<string, Control<any>>
      )[field.field];
      createScopedEffect((c) => {
        evalExpr(
          c,
          coerce(staticValue ?? undefined),
          targetField,
          undefined,
          coerce,
        );
      }, level.overrides);
    }
  }
}

/**
 * Check if an element or any of its nested compound children have scripts.
 */
function hasAnyScripts(
  target: any,
  schemaNode: SchemaNode,
  getScripts: ScriptProvider,
  path: string,
): boolean {
  if (target == null) return false;
  const scripts = getScripts(target, path);
  if (scripts && typeof scripts === "object" && Object.keys(scripts).length > 0)
    return true;
  for (const field of schemaNode.getResolvedFields()) {
    if (!isCompoundField(field) || !field.children?.length) continue;
    const childNode = schemaNode.createChildNode(field);
    const childTarget = target[field.field];
    if (field.collection) {
      // Collection elements start a new proxy context
      if (
        Array.isArray(childTarget) &&
        childTarget.some((elem: any) =>
          hasAnyScripts(elem, childNode, defaultScriptProvider, ""),
        )
      )
        return true;
    } else {
      const childPath = path ? path + "." + field.field : field.field;
      if (hasAnyScripts(childTarget, childNode, getScripts, childPath))
        return true;
    }
  }
  return false;
}

/**
 * Recursively wire updateComputedValue for compound fields and evaluate their $scripts.
 * For non-collection compound fields, creates an override proxy for the nested object.
 * For collection compound fields, maps each array element through createScriptedProxy.
 */
function wireProxies(
  target: any,
  level: OverrideLevel,
  schemaNode: SchemaNode,
  evalExpr: EvalExpr,
  scope: CleanupScope,
  getScripts: ScriptProvider,
  path: string,
): void {
  for (const field of schemaNode.getResolvedFields()) {
    if (!isCompoundField(field) || !field.children?.length) continue;

    const childNode = schemaNode.createChildNode(field);
    const parentFields = level.overrides.fields as Record<
      string,
      Control<any>
    >;
    const fieldControl = parentFields[field.field];

    if (field.collection) {
      // For collection compound fields, map each element through createScriptedProxy.
      // Collection elements start a new proxy context with defaultScriptProvider.
      updateComputedValue(fieldControl, () => {
        const arr = target?.[field.field];
        if (!Array.isArray(arr)) return arr;
        return arr.map((elem: any) => {
          if (!hasAnyScripts(elem, childNode, defaultScriptProvider, ""))
            return elem;
          return createScriptedProxy(
            elem,
            childNode,
            evalExpr,
            scope,
            defaultScriptProvider,
          ).proxy;
        });
      });
    } else {
      const childLevel = level.children.get(field.field);
      if (!childLevel) continue;
      const childTarget = target?.[field.field];
      const childPath = path ? path + "." + field.field : field.field;
      updateComputedValue(fieldControl, () =>
        childTarget != null
          ? createOverrideProxy(childTarget, childLevel.overrides)
          : undefined,
      );

      // Evaluate $scripts on the child object
      evaluateScripts(
        childTarget,
        childLevel,
        childNode,
        evalExpr,
        getScripts,
        childPath,
      );

      // Recurse into deeper compound children
      wireProxies(
        childTarget ?? {},
        childLevel,
        childNode,
        evalExpr,
        scope,
        getScripts,
        childPath,
      );
    }
  }
}

/**
 * Build an override/proxy hierarchy automatically from any SchemaNode,
 * reading `$scripts` from the target object at each level.
 */
export function createScriptedProxy<T extends object>(
  target: T,
  schemaNode: SchemaNode,
  evalExpr: EvalExpr,
  scope: CleanupScope,
  getScripts: ScriptProvider = defaultScriptProvider,
): { proxy: T; rootOverrides: Control<Record<string, any>> } {
  const root = buildOverrideLevels(schemaNode, scope);
  wireProxies(target, root, schemaNode, evalExpr, scope, getScripts, "");

  // Evaluate root-level $scripts
  evaluateScripts(target, root, schemaNode, evalExpr, getScripts, "");

  return {
    proxy: createOverrideProxy(target, root.overrides),
    rootOverrides: root.overrides,
  };
}