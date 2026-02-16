import {
  CleanupScope,
  Control,
  createScopedEffect,
  updateComputedValue,
} from "@astroapps/controls";
import { isCompoundField, SchemaField, SchemaTags } from "./schemaField";
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
  schema: SchemaField[],
  scope: CleanupScope,
): OverrideLevel {
  const overrides = createScoped<Record<string, any>>(scope, {});
  const children = new Map<string, OverrideLevel>();
  for (const field of schema) {
    if (
      isCompoundField(field) &&
      field.children?.length > 0 &&
      !field.collection
    ) {
      children.set(field.field, buildOverrideLevels(field.children, scope));
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
  schema: SchemaField[],
  evalExpr: EvalExpr,
  getScripts: ScriptProvider,
): void {
  const scripts: Record<string, EntityExpression> = getScripts(target);

  const scriptedKeys = new Set<string>();

  for (const [key, expr] of Object.entries(scripts)) {
    const field = schema.find((f) => f.field === key);
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
  for (const field of schema) {
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
 * Recursively wire updateComputedValue for compound fields and evaluate their $scripts.
 * For non-collection compound fields, creates an override proxy for the nested object.
 * For collection compound fields, maps each array element through createScriptedProxy.
 */
function wireProxies(
  target: any,
  level: OverrideLevel,
  schema: SchemaField[],
  evalExpr: EvalExpr,
  scope: CleanupScope,
  getScripts: ScriptProvider,
): void {
  for (const field of schema) {
    if (!isCompoundField(field) || !field.children?.length) continue;

    const parentFields = level.overrides.fields as Record<
      string,
      Control<any>
    >;
    const fieldControl = parentFields[field.field];

    if (field.collection) {
      // For collection compound fields, map each element through createScriptedProxy
      updateComputedValue(fieldControl, () => {
        const arr = target?.[field.field];
        if (!Array.isArray(arr)) return arr;
        return arr.map((elem: any) => {
          const elemScripts = getScripts(elem);
          if (
            !elemScripts ||
            typeof elemScripts !== "object" ||
            Object.keys(elemScripts).length === 0
          )
            return elem;
          return createScriptedProxy(
            elem,
            field.children,
            evalExpr,
            scope,
            getScripts,
          ).proxy;
        });
      });
    } else {
      const childLevel = level.children.get(field.field);
      if (!childLevel) continue;
      const childTarget = target?.[field.field];

      updateComputedValue(fieldControl, () =>
        childTarget != null
          ? createOverrideProxy(childTarget, childLevel.overrides)
          : undefined,
      );

      // Evaluate $scripts on the child object
      evaluateScripts(
        childTarget,
        childLevel,
        field.children,
        evalExpr,
        getScripts,
      );

      // Recurse into deeper compound children
      wireProxies(
        childTarget ?? {},
        childLevel,
        field.children,
        evalExpr,
        scope,
        getScripts,
      );
    }
  }
}

/**
 * Build an override/proxy hierarchy automatically from any SchemaField[],
 * reading `$scripts` from the target object at each level.
 */
export function createScriptedProxy<T extends object>(
  target: T,
  schema: SchemaField[],
  evalExpr: EvalExpr,
  scope: CleanupScope,
  getScripts: ScriptProvider = defaultScriptProvider,
): { proxy: T; rootOverrides: Control<Record<string, any>> } {
  const root = buildOverrideLevels(schema, scope);
  wireProxies(target, root, schema, evalExpr, scope, getScripts);

  // Evaluate root-level $scripts
  evaluateScripts(target, root, schema, evalExpr, getScripts);

  return {
    proxy: createOverrideProxy(target, root.overrides),
    rootOverrides: root.overrides,
  };
}
