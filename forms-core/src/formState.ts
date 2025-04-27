import { FormNode, lookupDataNode } from "./formNode";
import { SchemaDataNode, validDataNode } from "./schemaDataNode";
import {
  ActionControlDefinition,
  ControlAdornmentType,
  ControlDefinition,
  DataControlDefinition,
  DataRenderType,
  DisplayData,
  DynamicPropertyType,
  isActionControl,
  isControlDisabled,
  isControlDisplayOnly,
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
  getControlPath,
  newControl,
  trackedValue,
  unsafeRestoreControl,
  updateComputedValue,
  withChildren,
} from "@astroapps/controls";
import { defaultEvaluators, ExpressionEval } from "./evalExpression";
import { EntityExpression } from "./entityExpression";
import { createScoped, createScopedComputed, jsonPathString } from "./util";
import { setupValidation } from "./validators";

export interface ControlState {
  definition: ControlDefinition;
  context: FormContext;
  schemaInterface: SchemaInterface;
  dataNode?: SchemaDataNode | undefined;
  style?: Control<object | undefined>;
  layoutStyle?: Control<object | undefined>;
  allowedOptions?: Control<any[] | undefined>;
}

export interface FormContext {
  readonly: boolean;
  hidden: boolean;
  disabled: boolean;
  displayOnly: boolean;
  inline: boolean;
  clearHidden: boolean;
  formData: FormContextData;
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

const formStates: FormState[] = [];
export function createFormState(
  schemaInterface: SchemaInterface,
  evaluators: Record<string, ExpressionEval<any>> = defaultEvaluators,
): FormState {
  console.log("createFormState");
  const controlStates = newControl<Record<string, FormContextOptions>>({});
  return {
    cleanup: () => {
      console.log("Cleanup form state");
      controlStates.cleanup();
    },
    cleanupControl(parent: SchemaDataNode, formNode: FormNode) {
      const stateId = parent.id + "$" + formNode.id;
      const c = controlStates.fields[stateId];
      c.cleanup();
      // console.log("Unmount" + stateId);
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
      return createScopedMetaValue(formNode, controlImpl, "impl", (scope) => {
        // console.log(
        //   "Creating impl for TEST2",
        //   stateId,
        //   isDataControl(formNode.definition) ? formNode.definition.field : "_",
        // );
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
        const myContext = createScopedComputed<FormContext>(scope, () => {
          const {
            disabled,
            readonly,
            hidden,
            displayOnly,
            inline,
            clearHidden,
            formData,
          } = controlImpl.fields;
          return {
            hidden: hidden.value || !!definition.hidden,
            readonly: readonly.value || isControlReadonly(definition),
            disabled: disabled.value || isControlDisabled(definition),
            displayOnly: displayOnly.value || isControlDisplayOnly(definition),
            inline: !!inline.value,
            formData: formData.value ?? {},
            clearHidden: !!clearHidden.value,
          };
        });

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
              definition.defaultValue != null &&
              !definition.adornments?.some(
                (x) => x.type === ControlAdornmentType.Optional,
              ) &&
              definition.renderOptions?.type != DataRenderType.NullToggle
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
        return new ControlStateImpl(
          definition,
          myContext,
          schemaInterface,
          dataNode,
          style,
          layoutStyle,
          allowedOptions,
        );

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
  if (!evalExpr(dynamic, (r) => !r))
    updateComputedValue(hidden, () => {
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
  if (!evalExpr(dynamic, (r) => !!r))
    updateComputedValue(control, () => isControlReadonly(def));
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
  if (!evalExpr(dynamic, (r) => !!r))
    updateComputedValue(control, () => isControlDisabled(def));
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
  formNode: FormNode,
  c: Control<any>,
  key: string,
  init: (scope: CleanupScope) => A,
): A {
  return ensureMetaValue(c, key, () => {
    const holder = createScoped<A | undefined>(c, undefined);
    const effect = createSyncEffect(() => {
      holder.cleanup();
      holder.value = init(holder);
    }, c);
    // effect.run = () => {
    //   console.log(
    //     effect.subscriptions.map(
    //       (x) =>
    //         `${x[1]?.mask} ${jsonPathString(getControlPath(x[0], unsafeRestoreControl(formNode.definition)))}`,
    //     ),
    //   );
    // };
    return holder;
  }).value!;
}

class ControlStateImpl implements ControlState {
  constructor(
    public definition: ControlDefinition,
    private _context: Control<FormContext>,
    public schemaInterface: SchemaInterface,
    public _dataNode: Control<SchemaDataNode | undefined>,
    public style?: Control<object | undefined>,
    public layoutStyle?: Control<object | undefined>,
    public allowedOptions?: Control<any[] | undefined>,
  ) {}

  get context() {
    return this._context.value;
  }

  get dataNode() {
    return this._dataNode.value;
  }
}
