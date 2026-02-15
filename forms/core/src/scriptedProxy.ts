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
import {
  resolveSchemaPath,
  coerceForFieldType,
  hasSchemaTag,
} from "./controlDefinitionSchemas";

export type EvalExpr = <A>(
  scope: CleanupScope,
  init: A,
  nk: Control<A>,
  e: EntityExpression | undefined,
  coerce: (t: unknown) => any,
) => boolean;

interface OverrideLevel {
  overrides: Control<Record<string, any>>;
  children: Map<string, OverrideLevel>;
}

/**
 * Recursively create override controls for each compound-with-children field.
 */
function buildOverrideLevels(
  schema: SchemaField[],
  scope: CleanupScope,
): OverrideLevel {
  const overrides = createScoped<Record<string, any>>(scope, {});
  const children = new Map<string, OverrideLevel>();
  for (const field of schema) {
    if (isCompoundField(field) && field.children?.length > 0) {
      children.set(field.field, buildOverrideLevels(field.children, scope));
    }
  }
  return { overrides, children };
}

/**
 * Recursively wire updateComputedValue for compound fields so that
 * reading proxy.displayData returns createOverrideProxy(target.displayData, childOverrides).
 */
function wireProxies(
  target: any,
  level: OverrideLevel,
  schema: SchemaField[],
): void {
  for (const field of schema) {
    if (!isCompoundField(field) || !level.children.has(field.field)) continue;
    const childLevel = level.children.get(field.field)!;
    const parentFields = level.overrides.fields as Record<
      string,
      Control<any>
    >;
    const fieldControl = parentFields[field.field];
    const childTarget = target?.[field.field];

    updateComputedValue(fieldControl, () =>
      childTarget != null
        ? createOverrideProxy(childTarget, childLevel.overrides)
        : undefined,
    );

    wireProxies(childTarget ?? {}, childLevel, field.children);
  }
}

/**
 * Walk the OverrideLevel tree to find the correct override control for a dot-path.
 */
function findOverrideTarget(
  root: OverrideLevel,
  segments: string[],
): { targetOverride: Control<Record<string, any>>; fieldName: string } {
  let current = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const child = current.children.get(segments[i]);
    if (!child) break;
    current = child;
  }
  return {
    targetOverride: current.overrides,
    fieldName: segments[segments.length - 1],
  };
}

export function getNestedValue(obj: any, segments: string[]): any {
  let current = obj;
  for (const seg of segments) {
    if (current == null) return undefined;
    current = current[seg];
  }
  return current;
}

/**
 * Build an override/proxy hierarchy automatically from any SchemaField[],
 * evaluating scripts against the target object.
 */
export function createScriptedProxy<T extends object>(
  target: T,
  scripts: Record<string, EntityExpression>,
  schema: SchemaField[],
  evalExpr: EvalExpr,
  scope: CleanupScope,
): { proxy: T; rootOverrides: Control<Record<string, any>> } {
  const root = buildOverrideLevels(schema, scope);
  wireProxies(target, root, schema);

  const scriptedKeys = new Set<string>();

  for (const [key, expr] of Object.entries(scripts)) {
    const resolved = resolveSchemaPath(key, schema);
    if (!resolved) continue;

    scriptedKeys.add(key);
    const { segments, leafField } = resolved;
    const coerce = coerceForFieldType(leafField.type);
    const { targetOverride, fieldName } = findOverrideTarget(root, segments);
    const targetField = (
      targetOverride.fields as Record<string, Control<any>>
    )[fieldName];

    const nullInit = hasSchemaTag(leafField, SchemaTags.ScriptNullInit);
    const staticValue = getNestedValue(target, segments);
    const initValue = nullInit ? staticValue : coerce(staticValue ?? undefined);

    createScopedEffect((c) => {
      evalExpr(c, initValue, targetField, expr, coerce);
    }, targetOverride);
  }

  // For ScriptNullInit fields with no script, init the override to the coerced
  // static value so the proxy doesn't fall through to raw undefined/null.
  for (const field of schema) {
    if (hasSchemaTag(field, SchemaTags.ScriptNullInit) && !scriptedKeys.has(field.field)) {
      const coerce = coerceForFieldType(field.type);
      const staticValue = getNestedValue(target, [field.field]);
      const targetField = (
        root.overrides.fields as Record<string, Control<any>>
      )[field.field];
      createScopedEffect((c) => {
        evalExpr(c, coerce(staticValue ?? undefined), targetField, undefined, coerce);
      }, root.overrides);
    }
  }

  return {
    proxy: createOverrideProxy(target, root.overrides),
    rootOverrides: root.overrides,
  };
}
