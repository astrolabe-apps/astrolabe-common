import {
  ControlDefinition,
  DynamicPropertyType,
  ControlDataContext,
  getRootDataNode,
  getJsonPath,
  isDataControl,
} from "./controlDefinition";
import React, { useEffect, useMemo, useRef } from "react";
import {
  addAfterChangesCallback,
  collectChanges,
  Control,
  SubscriptionTracker,
  trackedValue,
  useCalculatedControl,
  useComputed,
  useControl,
  useRefState,
} from "@react-typed-forms/core";

import {
  defaultValueForField,
  elementValueForField,
  getDisplayOnlyOptions,
  isControlDisabled,
  isControlReadonly,
  JsonPath,
  jsonPathString,
} from "./util";
import jsonata from "jsonata";
import { v4 as uuidv4 } from "uuid";
import { DynamicHookGenerator, HookDep, toDepString } from "./dynamicHooks";
import {
  DataExpression,
  DataMatchExpression,
  EntityExpression,
  ExpressionType,
  JsonataExpression,
  NotEmptyExpression,
} from "./entityExpression";
import { SchemaInterface } from "./schemaInterface";
import { schemaDataForFieldRef, SchemaDataNode } from "./schemaDataNode";

export type EvalExpressionHook<A = any> = DynamicHookGenerator<
  Control<A | undefined>,
  ControlDataContext
>;

export type UseEvalExpressionHook = (
  expr: EntityExpression | undefined | null,
  coerce: (v: any) => any,
) => DynamicHookGenerator<Control<any> | undefined, ControlDataContext>;

export function optionalHook(
  expr: EntityExpression | undefined | null,
  useHook: UseEvalExpressionHook,
  coerce: (v: any) => any,
):
  | DynamicHookGenerator<Control<any> | undefined, ControlDataContext>
  | undefined {
  return expr && expr.type ? useHook(expr, coerce) : undefined;
}

export function useEvalVisibilityHook(
  useEvalExpressionHook: UseEvalExpressionHook,
  definition: ControlDefinition,
  overrideDataNode?: SchemaDataNode,
): EvalExpressionHook<boolean> {
  const dynamicVisibility = useEvalDynamicBoolHook(
    definition,
    DynamicPropertyType.Visible,
    useEvalExpressionHook,
  );
  return makeDynamicPropertyHook(
    dynamicVisibility,
    (ctx, { definition, overrideDataNode }) =>
      useComputed(() => {
        const dataNode = overrideDataNode ?? ctx.dataNode;
        return (
          !dataNode ||
          (matchesType(dataNode) &&
            !hideDisplayOnly(dataNode, ctx.schemaInterface, definition))
        );
      }),
    { definition, overrideDataNode },
  );
}

export function useEvalReadonlyHook(
  useEvalExpressionHook: UseEvalExpressionHook,
  definition: ControlDefinition,
): EvalExpressionHook<boolean> {
  const dynamicReadonly = useEvalDynamicBoolHook(
    definition,
    DynamicPropertyType.Readonly,
    useEvalExpressionHook,
  );
  return makeDynamicPropertyHook(
    dynamicReadonly,
    (ctx, { definition }) =>
      useCalculatedControl(() => isControlReadonly(definition)),
    { definition },
  );
}

export function useEvalStyleHook(
  useEvalExpressionHook: UseEvalExpressionHook,
  property: DynamicPropertyType,
  definition: ControlDefinition,
): EvalExpressionHook<React.CSSProperties> {
  const dynamicStyle = useEvalDynamicHook(
    definition,
    property,
    useEvalExpressionHook,
  );
  return makeDynamicPropertyHook(
    dynamicStyle,
    () => useControl(undefined),
    undefined,
  );
}

export function useEvalAllowedOptionsHook(
  useEvalExpressionHook: UseEvalExpressionHook,
  definition: ControlDefinition,
): EvalExpressionHook<any[]> {
  const dynamicAllowed = useEvalDynamicHook(
    definition,
    DynamicPropertyType.AllowedOptions,
    useEvalExpressionHook,
  );
  return makeDynamicPropertyHook(
    dynamicAllowed,
    () => useControl([]),
    undefined,
  );
}

export function useEvalDisabledHook(
  useEvalExpressionHook: UseEvalExpressionHook,
  definition: ControlDefinition,
): EvalExpressionHook<boolean> {
  const dynamicDisabled = useEvalDynamicBoolHook(
    definition,
    DynamicPropertyType.Disabled,
    useEvalExpressionHook,
  );
  return makeDynamicPropertyHook(
    dynamicDisabled,
    (ctx) =>
      useComputed(() => {
        const dataControl = ctx.dataNode?.control;
        const setToNull = dataControl?.meta["nullControl"]?.value === false;
        return setToNull || isControlDisabled(definition);
      }),
    undefined,
  );
}

export function useEvalDisplayHook(
  useEvalExpressionHook: UseEvalExpressionHook,
  definition: ControlDefinition,
): DynamicHookGenerator<
  Control<string | undefined> | undefined,
  ControlDataContext
> {
  return useEvalDynamicHook<string | undefined>(
    definition,
    DynamicPropertyType.Display,
    useEvalExpressionHook,
  );
}
export function useEvalDefaultValueHook(
  useEvalExpressionHook: UseEvalExpressionHook,
  definition: ControlDefinition,
): EvalExpressionHook {
  const dynamicValue = useEvalDynamicHook(
    definition,
    DynamicPropertyType.DefaultValue,
    useEvalExpressionHook,
  );
  return makeDynamicPropertyHook(
    dynamicValue,
    (ctx, { definition }) => {
      return useComputed(calcDefault);
      function calcDefault() {
        const [required, dcv] = isDataControl(definition)
          ? [definition.required, definition.defaultValue]
          : [false, undefined];
        const field = ctx.dataNode?.schema.field;
        return (
          dcv ??
          (field
            ? ctx.dataNode!.elementIndex != null
              ? elementValueForField(field)
              : defaultValueForField(field, required)
            : undefined)
        );
      }
    },
    { definition },
  );
}

function useDataExpression(
  fvExpr: DataExpression,
  node: SchemaDataNode,
  coerce: (v: any) => any = (x) => x,
) {
  const otherField = schemaDataForFieldRef(fvExpr.field, node);
  return useCalculatedControl(() => coerce(otherField.control?.value));
}

function useDataMatchExpression(
  fvExpr: DataMatchExpression,
  node: SchemaDataNode,
  coerce: (v: any) => any = (x) => x,
) {
  const otherField = schemaDataForFieldRef(fvExpr.field, node);
  return useCalculatedControl(() => {
    const fv = otherField.control?.value;
    return coerce(
      Array.isArray(fv) ? fv.includes(fvExpr.value) : fv === fvExpr.value,
    );
  });
}

function useNotEmptyExpression(
  fvExpr: NotEmptyExpression,
  node: SchemaDataNode,
  schemaInterface: SchemaInterface,
  coerce: (v: any) => any = (x) => x,
) {
  const otherField = schemaDataForFieldRef(fvExpr.field, node);
  return useCalculatedControl(() => {
    const fv = otherField.control?.value;
    const field = otherField.schema.field;
    return coerce(field && !schemaInterface.isEmptyValue(field, fv));
  });
}

export function defaultEvalHooks(
  expr: EntityExpression,
  context: ControlDataContext,
  coerce: (v: any) => any,
) {
  switch (expr.type) {
    case ExpressionType.Jsonata:
      const bindings = useComputed(() => ({ formData: context.formData }));
      return useJsonataExpression(
        (expr as JsonataExpression).expression,
        getRootDataNode(context.parentNode).control!,
        getJsonPath(context.parentNode),
        bindings,
        coerce,
      );
    case ExpressionType.UUID:
      return useUuidExpression(coerce);
    case ExpressionType.Data:
      return useDataExpression(
        expr as DataExpression,
        context.parentNode,
        coerce,
      );
    case ExpressionType.DataMatch:
      return useDataMatchExpression(
        expr as DataMatchExpression,
        context.parentNode,
        coerce,
      );
    case ExpressionType.NotEmpty:
      return useNotEmptyExpression(
        expr as NotEmptyExpression,
        context.parentNode,
        context.schemaInterface,
        coerce,
      );
    default:
      return useControl(undefined);
  }
}

export const defaultUseEvalExpressionHook =
  makeEvalExpressionHook(defaultEvalHooks);

export function makeEvalExpressionHook(
  f: (
    expr: EntityExpression,
    context: ControlDataContext,
    coerce: (v: any) => any,
  ) => Control<any>,
): UseEvalExpressionHook {
  return (expr, coerce) => ({
    deps: expr?.type,
    state: expr && expr.type ? expr : undefined,
    runHook: (ctx: ControlDataContext, state: EntityExpression | undefined) => {
      return state ? f(state, ctx, coerce) : undefined;
    },
  });
}

export function useEvalDynamicBoolHook(
  definition: ControlDefinition,
  type: DynamicPropertyType,
  useEvalExpressionHook: UseEvalExpressionHook,
): DynamicHookGenerator<Control<any> | undefined, ControlDataContext> {
  return useEvalDynamicHook(definition, type, useEvalExpressionHook, (x) =>
    Boolean(x),
  );
}

export function useEvalDynamicHook<V>(
  definition: ControlDefinition,
  type: DynamicPropertyType,
  useEvalExpressionHook: UseEvalExpressionHook,
  coerce: (v: any) => any = (x) => x,
): DynamicHookGenerator<Control<V> | undefined, ControlDataContext> {
  const expression = definition.dynamic?.find((x) => x.type === type);
  return useEvalExpressionHook(
    expression?.expr,
    coerce,
  ) as DynamicHookGenerator<Control<V> | undefined, ControlDataContext>;
}

export function matchesType(context: SchemaDataNode): boolean {
  const types = context.schema.field.onlyForTypes;
  if (types == null || types.length === 0) return true;
  const parent = context.parent!;
  const typeNode = parent.schema
    .getChildNodes()
    .find((x) => x.field.isTypeField);
  if (typeNode == null) {
    console.warn("No type field found for", parent.schema);
    return false;
  }
  const typeField = parent.getChild(typeNode).control as Control<string>;
  return typeField && types.includes(typeField.value);
}

export function hideDisplayOnly(
  context: SchemaDataNode,
  schemaInterface: SchemaInterface,
  definition: ControlDefinition,
) {
  const displayOptions = getDisplayOnlyOptions(definition);
  return (
    displayOptions &&
    !displayOptions.emptyText &&
    schemaInterface.isEmptyValue(context.schema.field, context.control?.value)
  );
}

export function useUuidExpression(coerce: (v: any) => any = (x) => x) {
  return useControl(() => coerce(uuidv4()));
}

export function useJsonataExpression(
  jExpr: string,
  data: Control<any>,
  path: JsonPath[],
  bindings?: Control<Record<string, any>>,
  coerce: (v: any) => any = (x) => x,
): Control<any> {
  const pathString = jsonPathString(path, (x) => `#$i[${x}]`);
  const fullExpr = pathString ? pathString + ".(" + jExpr + ")" : jExpr;
  const compiledExpr = useMemo(() => {
    try {
      return jsonata(jExpr ? fullExpr : "null");
    } catch (e) {
      console.error(e);
      return jsonata("null");
    }
  }, [fullExpr]);
  const control = useControl();
  const listenerRef = useRef<() => void>(undefined);
  const updateRef = useRef(0);
  const [ref] = useRefState(
    () =>
      new SubscriptionTracker(() => {
        const l = listenerRef.current;
        if (l) {
          listenerRef.current = undefined;
          addAfterChangesCallback(() => {
            listenerRef.current = l;
            l();
          });
        }
      }),
  );
  useEffect(() => {
    listenerRef.current = apply;
    apply();
    async function apply() {
      const tracker = ref.current;
      try {
        updateRef.current++;
        control.value = coerce(
          await compiledExpr.evaluate(
            trackedValue(data, tracker.collectUsage),
            collectChanges(tracker.collectUsage, () => bindings?.value),
          ),
        );
      } finally {
        if (!--updateRef.current) tracker.update();
      }
    }
  }, [compiledExpr]);
  useEffect(() => {
    return () => {
      listenerRef.current = undefined;
      ref.current.cleanup();
    };
  }, []);
  return control;
}

export function useEvalActionHook(
  useExpr: UseEvalExpressionHook,
  definition: ControlDefinition,
): EvalExpressionHook<string | null> {
  const dynamicValue = useEvalDynamicHook(
    definition,
    DynamicPropertyType.ActionData,
    useExpr,
  );
  return makeDynamicPropertyHook(
    dynamicValue,
    () => useControl(null),
    undefined,
  );
}

export function useEvalLabelText(
  useExpr: UseEvalExpressionHook,
  definition: ControlDefinition,
): EvalExpressionHook<string | null> {
  const dynamicValue = useEvalDynamicHook(
    definition,
    DynamicPropertyType.Label,
    useExpr,
  );
  return makeDynamicPropertyHook(
    dynamicValue,
    () => useControl(null),
    undefined,
  );
}

function makeDynamicPropertyHook<A, S = undefined>(
  dynamicValue: DynamicHookGenerator<
    Control<any> | undefined,
    ControlDataContext
  >,
  makeDefault: (ctx: ControlDataContext, s: S) => Control<A | undefined>,
  state: S,
  deps?: HookDep,
): EvalExpressionHook<A> {
  return {
    deps:
      deps === undefined
        ? dynamicValue.deps
        : [deps, dynamicValue.deps].map(toDepString).join(),
    runHook: (ctx, s) => {
      return dynamicValue.runHook(ctx, s[0])?.as() ?? makeDefault(ctx, s[1]);
    },
    state: [dynamicValue.state, state],
  };
}
