import { FormNode, lookupDataNode } from "./formNode";
import { SchemaDataNode, validDataNode } from "./schemaDataNode";
import {
  ActionControlDefinition,
  ControlDefinition,
  DataControlDefinition,
  DisplayData,
  DynamicPropertyType,
  isActionControl,
  isControlDisabled,
  isControlReadonly,
  isDataControl,
  isDisplayControl,
} from "./controlDefinition";
import { SchemaInterface } from "./schemaInterface";
import { FieldOption } from "./schemaField";
import {
  CleanupScope,
  clearMetaValue,
  Control,
  createSyncEffect,
  ensureMetaValue,
  newControl,
  updateComputedValue,
  withChildren,
} from "@astroapps/controls";
import { defaultEvaluators, ExpressionEval } from "./evalExpression";
import { EntityExpression } from "./entityExpression";
import { createScoped, createScopedComputed } from "./util";
import { setupValidation } from "./validators";

export interface ControlState {
  definition: ControlDefinition;
  style?: Control<object | undefined>;
  layoutStyle?: Control<object | undefined>;
  allowedOptions?: Control<any[] | undefined>;
}

export interface FormContextOptions {
  readonly?: boolean | null;
  hidden?: boolean | null;
  disabled?: boolean | null;
  displayOnly?: boolean;
  inline?: boolean;
  clearHidden?: boolean;
  formData?: FormContextData;
}

/**
 * Interface representing the form context data.
 */
export interface FormContextData {
  option?: FieldOption;
  optionSelected?: boolean;
}

export interface FormState {
  getControlState(
    parent: SchemaDataNode,
    formNode: FormNode,
    context: FormContextOptions,
  ): ControlState;
  cleanup(): void;
  cleanupControl(parent: SchemaDataNode, formNode: FormNode): void;
}

export type ControlLogics<A> = { [K in keyof A]?: ControlLogic<any> };

export type ControlLogic<T> = (
  control: Control<any>,
  context: Control<FormContextOptions>,
  parent: SchemaDataNode,
  formNode: FormNode,
  evalExpr: (
    expr: EntityExpression | undefined,
    coerce: (v: unknown) => T,
  ) => boolean,
) => void;

export function createFormState(
  schemaInterface: SchemaInterface,
  evaluators: Record<string, ExpressionEval<any>> = defaultEvaluators,
): FormState {
  console.log("createFormState");
  const controlStates = newControl<Record<string, FormContextOptions>>({});
  withChildren(controlStates, (x) => x.cleanup());
  return {
    cleanup: () => controlStates.cleanup(),
    cleanupControl(parent: SchemaDataNode, formNode: FormNode) {
      const stateId = parent.id + "$" + formNode.id;
      const c = controlStates.fields[stateId];
      c.cleanup();
      clearMetaValue(c, "impl");
    },
    getControlState(
      parent: SchemaDataNode,
      formNode: FormNode,
      context: FormContextOptions,
    ): ControlState {
      const stateId = parent.id + "$" + formNode.id;
      const controlImpl = controlStates.fields[stateId];
      controlImpl.value = context;
      return createScopedMetaValue(controlImpl, "impl", (scope) => {
        const dataNode = createScopedComputed(scope, () =>
          lookupDataNode(formNode.definition, parent),
        );
        function evalExpr(
          nk: Control<any>,
          e: EntityExpression | undefined,
          coerce: (t: unknown) => any,
        ): boolean {
          if (e?.type) {
            const x = evaluators[e.type];
            if (x) {
              x(e, {
                returnResult: (r) => {
                  nk.value = coerce(r);
                },
                scope: nk,
                dataNode: parent,
                formContext: controlImpl,
                schemaInterface,
              });
              return true;
            }
          }
          return false;
        }

        const displayHandler = setupDisplay();

        function createProxy<A extends object>(
          proxyFor: A,
          logics: ControlLogics<any>,
        ): [A, Record<string, () => any>] {
          const handlers: Record<string, () => any> = {};

          for (const k in logics) {
            const nk = createScoped<any>(scope, undefined);
            logics[k]!(nk, controlImpl, parent, formNode, (e, c) =>
              evalExpr(nk, e, c),
            );
            handlers[k] = () => nk.value;
          }

          const proxy: A = new Proxy(proxyFor, {
            get(target: A, p: string | symbol, receiver: any): any {
              const override = handlers[p as string];
              if (override) return override();
              return target[p as keyof A];
            },
          });
          return [proxy, handlers];
        }

        const [definition, handlers] = createProxy(formNode.definition, logics);
        handlers["displayData"] = displayHandler;
        const style = createScoped(scope, undefined);
        const layoutStyle = createScoped(scope, undefined);
        const allowedOptions = createScoped(scope, undefined);

        createSyncEffect(() => {
          const dn = dataNode.value;
          if (dn) {
            dn.control.disabled = !!handlers.disabled();
          }
        }, scope);

        evalExpr(
          style,
          firstExpr(formNode, DynamicPropertyType.Style),
          coerceStyle,
        );

        evalExpr(
          layoutStyle,
          firstExpr(formNode, DynamicPropertyType.LayoutStyle),
          coerceStyle,
        );

        evalExpr(
          allowedOptions,
          firstExpr(formNode, DynamicPropertyType.AllowedOptions),
          (x) => x,
        );

        setupValidation(
          controlImpl,
          definition,
          dataNode,
          schemaInterface,
          parent,
          formNode,
        );

        createSyncEffect(() => {
          const dn = dataNode.value?.control;
          if (dn && isDataControl(definition)) {
            if (definition.hidden) {
              if (
                controlImpl.fields.clearHidden.value &&
                !definition.dontClearHidden
              ) {
                console.log("Clearing hidden");
                dn.value = undefined;
              }
            } else if (
              dn.value === undefined &&
              definition.defaultValue != null
            ) {
              console.log(
                "Setting to default",
                definition.defaultValue,
                definition.field,
              );
              dn.value = definition.defaultValue;
            }
          }
        }, scope);
        return { definition, style, layoutStyle, allowedOptions };

        function setupDisplay(): () => any {
          const display = createScoped(scope, Never);
          evalExpr(
            display,
            firstExpr(formNode, DynamicPropertyType.Display),
            coerceString,
          );
          const displayProxy = createScopedComputed(scope, () => {
            const displayData = isDisplayControl(formNode.definition)
              ? formNode.definition.displayData
              : undefined;

            return displayData
              ? new Proxy(displayData, {
                  get(
                    target: DisplayData,
                    p: string | symbol,
                    receiver: any,
                  ): any {
                    if (p === "html" || p === "text") {
                      const v = display.value;
                      if (v !== Never) return v;
                    }
                    return target[p as keyof DisplayData];
                  },
                })
              : undefined;
          });
          return () => displayProxy.value;
        }
      });
    },
  };
}

function firstExpr(
  formNode: FormNode,
  property: DynamicPropertyType,
): EntityExpression | undefined {
  return formNode.definition.dynamic?.find(
    (x) => x.type === property && x.expr.type,
  )?.expr;
}

const hiddenLogic: ControlLogic<boolean | null | undefined> = (
  hidden,
  context,
  parent,
  formNode,
  evalExpr,
) => {
  const dynamic = firstExpr(formNode, DynamicPropertyType.Visible);
  if (!evalExpr(dynamic, (r) => context.fields.hidden.value || !r))
    updateComputedValue(hidden, () => {
      if (context.fields.hidden.value) {
        return true;
      }
      const dataNode = lookupDataNode(formNode.definition, parent);
      return !!dataNode && !validDataNode(dataNode);
    });
};

const readonlyLogic: ControlLogic<boolean | null | undefined> = (
  control,
  context,
  parent,
  formNode,
  evalExpr,
) => {
  const def = formNode.definition;
  const dynamic = firstExpr(formNode, DynamicPropertyType.Readonly);
  if (!evalExpr(dynamic, (r) => context.fields.readonly.value || !!r))
    updateComputedValue(
      control,
      () => context.fields.readonly.value || isControlReadonly(def),
    );
};

const disabledLogic: ControlLogic<boolean | null | undefined> = (
  control,
  context,
  parent,
  formNode,
  evalExpr,
) => {
  const def = formNode.definition;
  const dynamic = firstExpr(formNode, DynamicPropertyType.Disabled);
  if (!evalExpr(dynamic, (r) => context.fields.disabled.value || !!r))
    updateComputedValue(
      control,
      () => context.fields.disabled.value || isControlDisabled(def),
    );
};

const titleLogic: ControlLogic<string> = (
  control,
  context,
  parent,
  formNode,
  evalExpr,
) => {
  const def = formNode.definition;
  const dynamic = firstExpr(formNode, DynamicPropertyType.Label);
  if (!evalExpr(dynamic, coerceString))
    updateComputedValue(control, () => def.title);
};

const defaultValueLogic: ControlLogic<any> = (
  control,
  context,
  parent,
  formNode,
  evalExpr,
) => {
  const def = formNode.definition;
  const dynamic = firstExpr(formNode, DynamicPropertyType.DefaultValue);
  if (!evalExpr(dynamic, (x) => x))
    updateComputedValue(control, () =>
      isDataControl(def) ? def.defaultValue : undefined,
    );
};

const actionDataLogic: ControlLogic<any> = (
  control,
  context,
  parent,
  formNode,
  evalExpr,
) => {
  const def = formNode.definition;
  const dynamic = firstExpr(formNode, DynamicPropertyType.ActionData);
  if (!evalExpr(dynamic, (x) => x))
    updateComputedValue(control, () =>
      isActionControl(def) ? def.actionData : undefined,
    );
};

const logics: ControlLogics<DataControlDefinition | ActionControlDefinition> = {
  hidden: hiddenLogic,
  readonly: readonlyLogic,
  disabled: disabledLogic,
  title: titleLogic,
  defaultValue: defaultValueLogic,
  actionData: actionDataLogic,
};

function coerceStyle(v: unknown): any {
  return typeof v === "object" ? v : undefined;
}

function coerceString(v: unknown): string {
  return typeof v === "string" ? v : (v?.toString() ?? "");
}

class Never {}

function createScopedMetaValue<A>(
  c: Control<any>,
  key: string,
  init: (scope: CleanupScope) => A,
): A {
  return ensureMetaValue(c, key, () => {
    const holder = createScoped<A | undefined>(c, undefined);
    createSyncEffect(() => {
      holder.cleanup();
      holder.value = init(holder);
    }, c);
    return holder;
  }).value!;
}
