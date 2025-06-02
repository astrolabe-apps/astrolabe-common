import {
  CleanupScope,
  Control,
  createScopedEffect,
  createSyncEffect,
  getCurrentFields,
  updateComputedValue,
} from "@astroapps/controls";
import {
  AnyControlDefinition,
  ControlDefinition,
  DynamicPropertyType,
  HtmlDisplay,
  isActionControl,
  isControlDisabled,
  isControlReadonly,
  isDataControl,
  isDisplayControl,
  isHtmlDisplay,
  isTextDisplay,
  TextDisplay,
} from "./controlDefinition";
import { createScoped } from "./util";
import { EntityExpression } from "./entityExpression";

export type EvalExpr = <A>(
  scope: CleanupScope,
  init: A,
  nk: Control<A>,
  e: EntityExpression | undefined,
  coerce: (t: unknown) => any,
) => boolean;
export function getDefinitionOverrides(
  def: ControlDefinition,
  evalExpr: EvalExpr,
  scope: CleanupScope,
  display: Control<string | undefined>,
): Control<Record<string, any>> {
  const definitionOverrides = createScoped<Record<string, any>>(scope, {});
  const displayOverrides = createScoped<Record<string, any>>(scope, {});

  const of = definitionOverrides.fields as Record<
    KeysOfUnion<AnyControlDefinition>,
    Control<any>
  >;

  const { html, text } = displayOverrides.fields as Record<
    KeysOfUnion<TextDisplay | HtmlDisplay>,
    Control<any>
  >;

  updateComputedValue(of.displayData, () =>
    isDisplayControl(def)
      ? createOverrideProxy(def.displayData, displayOverrides)
      : undefined,
  );

  createScopedEffect((c) => {
    evalExpr(
      c,
      def.hidden,
      of.hidden,
      firstExpr(DynamicPropertyType.Visible),
      (r) => !r,
    );
  }, definitionOverrides);

  createScopedEffect((c) => {
    evalExpr(
      c,
      isControlReadonly(def),
      of.readonly,
      firstExpr(DynamicPropertyType.Readonly),
      (r) => !!r,
    );
  }, definitionOverrides);

  createScopedEffect((c) => {
    evalExpr(
      c,
      isControlDisabled(def),
      of.disabled,
      firstExpr(DynamicPropertyType.Disabled),
      (r) => !!r,
    );
  }, definitionOverrides);

  createScopedEffect((c) => {
    evalExpr(
      c,
      isDataControl(def) ? def.defaultValue : undefined,
      of.defaultValue,
      isDataControl(def)
        ? firstExpr(DynamicPropertyType.DefaultValue)
        : undefined,
      (r) => r,
    );
  }, definitionOverrides);

  createScopedEffect((c) => {
    evalExpr(
      c,
      isActionControl(def) ? def.actionData : undefined,
      of.actionData,
      isActionControl(def)
        ? firstExpr(DynamicPropertyType.ActionData)
        : undefined,
      (r) => r,
    );
  }, definitionOverrides);

  createScopedEffect((c) => {
    evalExpr(
      c,
      def.title,
      of.title,
      firstExpr(DynamicPropertyType.Label),
      coerceString,
    );
  }, definitionOverrides);

  createSyncEffect(() => {
    if (isDisplayControl(def)) {
      if (display.value !== undefined) {
        text.value = isTextDisplay(def.displayData)
          ? display.value
          : NoOverride;
        html.value = isHtmlDisplay(def.displayData)
          ? display.value
          : NoOverride;
      } else {
        text.value = NoOverride;
        html.value = NoOverride;
      }
    }
  }, displayOverrides);

  return definitionOverrides;

  function firstExpr(
    property: DynamicPropertyType,
  ): EntityExpression | undefined {
    return def.dynamic?.find((x) => x.type === property && x.expr.type)?.expr;
  }
}

export function coerceStyle(v: unknown): any {
  return typeof v === "object" ? v : undefined;
}

export function coerceString(v: unknown): string {
  return typeof v === "string" ? v : (v?.toString() ?? "");
}

export function createOverrideProxy<
  A extends object,
  B extends Record<string, any>,
>(proxyFor: A, handlers: Control<B>): A {
  const overrides = getCurrentFields(handlers);
  const allOwn = Reflect.ownKeys(proxyFor);
  Reflect.ownKeys(overrides).forEach((k) => {
    if (!allOwn.includes(k)) allOwn.push(k);
  });
  return new Proxy(proxyFor, {
    get(target: A, p: string | symbol, receiver: any): any {
      if (Object.hasOwn(overrides, p)) {
        const nv = overrides[p as keyof B]!.value;
        if (nv !== NoOverride) return nv;
      }
      return Reflect.get(target, p, receiver);
    },
    ownKeys(target: A): ArrayLike<string | symbol> {
      return allOwn;
    },
    has(target: A, p: string | symbol): boolean {
      return Reflect.has(proxyFor, p) || Reflect.has(overrides, p);
    },
    getOwnPropertyDescriptor(target, k) {
      if (Object.hasOwn(overrides, k))
        return {
          enumerable: true,
          configurable: true,
        };
      return Reflect.getOwnPropertyDescriptor(target, k);
    },
  });
}

class NoValue {}
const NoOverride = new NoValue();

type KeysOfUnion<T> = T extends T ? keyof T : never;
