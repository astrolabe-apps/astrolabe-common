import { FormNode, lookupDataNode } from "./formNode";
import {
  hideDisplayOnly,
  SchemaDataNode,
  validDataNode,
} from "./schemaDataNode";
import {
  AnyControlDefinition,
  ControlAdornmentType,
  ControlDefinition,
  DataRenderType,
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
import { SchemaInterface } from "./schemaInterface";
import { FieldOption } from "./schemaField";
import {
  CleanupScope,
  Control,
  createScopedEffect,
  createSyncEffect,
  ensureMetaValue,
  getControlPath,
  getCurrentFields,
  getMetaValue,
  newControl,
  unsafeRestoreControl,
  updateComputedValue,
} from "@astroapps/controls";
import {
  defaultEvaluators,
  ExpressionEval,
  ExpressionEvalContext,
} from "./evalExpression";
import { EntityExpression } from "./entityExpression";
import { createScoped, jsonPathString } from "./util";
import { setupValidation } from "./validators";

export interface ControlState {
  definition: ControlDefinition;
  schemaInterface: SchemaInterface;
  dataNode?: SchemaDataNode | undefined;
  display?: string;
  stateId?: string;
  style?: object;
  layoutStyle?: object;
  allowedOptions?: any[];
  readonly: boolean;
  hidden: boolean;
  disabled: boolean;
  clearHidden: boolean;
  variables: Record<string, any>;
  meta: Control<Record<string, any>>;
}

export interface FormContextOptions {
  readonly?: boolean | null;
  hidden?: boolean | null;
  disabled?: boolean | null;
  clearHidden?: boolean;
  stateKey?: string;
  variables?: Record<string, any>;
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
    runAsync: (af: () => void) => void,
  ): ControlState;

  cleanup(): void;

  evalExpression(expr: EntityExpression, context: ExpressionEvalContext): void;

  getExistingControlState(
    parent: SchemaDataNode,
    formNode: FormNode,
    stateKey?: string,
  ): ControlState | undefined;
}

const formStates: FormState[] = [];

export function getControlStateId(
  parent: SchemaDataNode,
  formNode: FormNode,
  stateKey?: string,
): string {
  return parent.id + "$" + formNode.id + (stateKey ?? "");
}

export function createFormState(
  schemaInterface: SchemaInterface,
  evaluators: Record<string, ExpressionEval<any>> = defaultEvaluators,
): FormState {
  // console.log("createFormState");
  const controlStates = newControl<Record<string, FormContextOptions>>({});

  function evalExpression(
    e: EntityExpression,
    context: ExpressionEvalContext,
  ): void {
    const x = evaluators[e.type];
    x?.(e, context);
  }

  return {
    evalExpression,
    cleanup: () => {
      // console.log("Cleanup form state");
      controlStates.cleanup();
    },
    getExistingControlState(
      parent: SchemaDataNode,
      formNode: FormNode,
      stateKey?: string,
    ): ControlState | undefined {
      const stateId = getControlStateId(parent, formNode, stateKey);
      const control = getCurrentFields(controlStates)[stateId];
      if (control) {
        return getMetaValue<Control<ControlState>>(control, "impl")?.value;
      }
      return undefined;
    },
    getControlState(
      parent: SchemaDataNode,
      formNode: FormNode,
      context: FormContextOptions,
      runAsync: (af: () => void) => void,
    ): ControlState {
      const stateId = getControlStateId(parent, formNode, context.stateKey);
      const controlImpl = controlStates.fields[stateId];
      controlImpl.value = context;
      function evalExpr<A>(
        scope: CleanupScope,
        init: A,
        nk: Control<A>,
        e: EntityExpression | undefined,
        coerce: (t: unknown) => any,
      ): boolean {
        nk.value = init;
        if (e?.type) {
          evalExpression(e, {
            returnResult: (r) => {
              nk.value = coerce(r);
            },
            scope,
            dataNode: parent,
            variables: controlImpl.fields.variables,
            schemaInterface,
            runAsync,
          });
          return true;
        }
        return false;
      }

      return createScopedMetaValue(formNode, controlImpl, "impl", (scope) => {
        const cf = controlImpl.fields;
        const definitionOverrides = createScoped<Record<string, any>>(
          controlImpl,
          {},
        );
        const displayControl = createScoped<string | undefined>(
          controlImpl,
          undefined,
        );

        const displayOverrides = createScoped<Record<string, any>>(
          controlImpl,
          {},
        );
        const def = formNode.definition;
        const definition = createOverrideProxy(def, definitionOverrides);
        const of = definitionOverrides.fields as Record<
          KeysOfUnion<AnyControlDefinition>,
          Control<any>
        >;

        const { text, html } = displayOverrides.fields as Record<
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
            firstExpr(formNode, DynamicPropertyType.Visible),
            (r) => !r,
          );
        }, definitionOverrides);

        createScopedEffect((c) => {
          evalExpr(
            c,
            isControlReadonly(def),
            of.readonly,
            firstExpr(formNode, DynamicPropertyType.Readonly),
            (r) => !!r,
          );
        }, definitionOverrides);

        createScopedEffect((c) => {
          evalExpr(
            c,
            isControlDisabled(def),
            of.disabled,
            firstExpr(formNode, DynamicPropertyType.Disabled),
            (r) => !!r,
          );
        }, definitionOverrides);

        createScopedEffect((c) => {
          evalExpr(
            c,
            isDataControl(def) ? def.defaultValue : undefined,
            of.defaultValue,
            isDataControl(def)
              ? firstExpr(formNode, DynamicPropertyType.DefaultValue)
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
              ? firstExpr(formNode, DynamicPropertyType.ActionData)
              : undefined,
            (r) => r,
          );
        }, definitionOverrides);

        createScopedEffect((c) => {
          evalExpr(
            c,
            def.title,
            of.title,
            firstExpr(formNode, DynamicPropertyType.Label),
            coerceString,
          );
        }, definitionOverrides);

        const control = createScoped<ControlState>(controlImpl, {
          definition,
          dataNode: undefined,
          schemaInterface,
          disabled: false,
          readonly: false,
          clearHidden: false,
          hidden: false,
          variables: controlImpl.fields.variables.current.value ?? {},
          stateId,
          meta: newControl({}),
        });

        const {
          dataNode,
          hidden,
          readonly,
          style,
          layoutStyle,
          allowedOptions,
          disabled,
          variables,
          display,
        } = control.fields;

        createScopedEffect(
          (c) =>
            evalExpr(
              c,
              undefined,
              style,
              firstExpr(formNode, DynamicPropertyType.Style),
              coerceStyle,
            ),
          scope,
        );

        createScopedEffect(
          (c) =>
            evalExpr(
              c,
              undefined,
              layoutStyle,
              firstExpr(formNode, DynamicPropertyType.LayoutStyle),
              coerceStyle,
            ),
          scope,
        );

        createScopedEffect(
          (c) =>
            evalExpr(
              c,
              undefined,
              allowedOptions,
              firstExpr(formNode, DynamicPropertyType.AllowedOptions),
              (x) => x,
            ),
          scope,
        );

        createScopedEffect(
          (c) =>
            evalExpr(
              c,
              undefined,
              display,
              firstExpr(formNode, DynamicPropertyType.Display),
              coerceString,
            ),
          scope,
        );

        updateComputedValue(dataNode, () => lookupDataNode(definition, parent));
        updateComputedValue(
          hidden,
          () =>
            !!cf.hidden.value ||
            definition.hidden ||
            (dataNode.value &&
              (!validDataNode(dataNode.value) ||
                hideDisplayOnly(dataNode.value, schemaInterface, definition))),
        );

        updateComputedValue(
          readonly,
          () => !!cf.readonly.value || isControlReadonly(definition),
        );
        updateComputedValue(
          disabled,
          () => !!cf.disabled.value || isControlDisabled(definition),
        );

        updateComputedValue(variables, () => {
          return controlImpl.fields.variables.value ?? {};
        });

        createSyncEffect(() => {
          const dn = dataNode.value;
          if (dn) {
            dn.control.disabled = disabled.value;
          }
        }, scope);

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

        setupValidation(
          controlImpl,
          definition,
          dataNode,
          schemaInterface,
          parent,
          formNode,
          runAsync,
        );

        createSyncEffect(() => {
          const dn = dataNode.value?.control;
          if (dn && isDataControl(definition)) {
            if (definition.hidden) {
              if (
                controlImpl.fields.clearHidden.value &&
                !definition.dontClearHidden
              ) {
                // console.log("Clearing hidden");
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
              // console.log(
              //   "Setting to default",
              //   definition.defaultValue,
              //   definition.field,
              // );
              // const [required, dcv] = isDataControl(definition)
              //   ? [definition.required, definition.defaultValue]
              //   : [false, undefined];
              // const field = ctx.dataNode?.schema.field;
              // return (
              //   dcv ??
              //   (field
              //     ? ctx.dataNode!.elementIndex != null
              //       ? elementValueForField(field)
              //       : defaultValueForField(field, required)
              //     : undefined)
              // );

              dn.value = definition.defaultValue;
            }
          }
        }, scope);
        return createOverrideProxy(control.current.value, control);
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

function coerceStyle(v: unknown): any {
  return typeof v === "object" ? v : undefined;
}

function coerceString(v: unknown): string {
  return typeof v === "string" ? v : (v?.toString() ?? "");
}

function createScopedMetaValue<A>(
  formNode: FormNode,
  c: Control<any>,
  key: string,
  init: (scope: CleanupScope) => A,
): A {
  return ensureMetaValue(c, key, () => {
    const holder = createScoped<A | undefined>(c, undefined, {
      equals: (a, b) => a === b,
    });
    const effect = createScopedEffect((c) => (holder.value = init(c)), holder);
    effect.run = () => {
      console.log(
        "ControlState being recreated:",
        effect.subscriptions.map(
          (x) =>
            `${x[1]?.mask} ${jsonPathString(getControlPath(x[0], unsafeRestoreControl(formNode.definition)))}`,
        ),
      );
    };
    return holder;
  }).value!;
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
