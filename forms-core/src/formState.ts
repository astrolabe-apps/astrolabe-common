import { FormNode, lookupDataNode } from "./formNode";
import { SchemaDataNode, validDataNode } from "./schemaDataNode";
import {
  ActionControlDefinition,
  AnyControlDefinition,
  ControlAdornmentType,
  ControlDefinition,
  DataControlDefinition,
  DataRenderType,
  DisplayData,
  DynamicPropertyType,
  HtmlDisplay,
  isActionControl,
  isControlDisabled,
  isControlDisplayOnly,
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
  clearMetaValue,
  Control,
  createEffect,
  createSyncEffect,
  ensureMetaValue,
  getControlPath,
  getExistingField,
  newControl,
  trackedValue,
  unsafeRestoreControl,
  unwrapTrackedControl,
  updateComputedValue,
  withChildren,
} from "@astroapps/controls";
import { defaultEvaluators, ExpressionEval } from "./evalExpression";
import { EntityExpression } from "./entityExpression";
import { createScoped, createScopedComputed, jsonPathString } from "./util";
import { setupValidation } from "./validators";
import { createScopedEffect } from "@astroapps/controls";

export interface ControlState {
  definition: ControlDefinition;
  schemaInterface: SchemaInterface;
  dataNode?: SchemaDataNode | undefined;
  style?: object;
  layoutStyle?: object;
  allowedOptions?: any[];
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

      function evalExpr<A>(
        scope: CleanupScope,
        init: A,
        nk: Control<A>,
        e: EntityExpression | undefined,
        coerce: (t: unknown) => any,
      ): boolean {
        nk.value = init;
        if (e?.type) {
          const x = evaluators[e.type];
          if (x) {
            x(e, {
              returnResult: (r) => {
                nk.value = coerce(r);
              },
              scope,
              dataNode: parent,
              formContext: controlImpl,
              schemaInterface,
            });
            return true;
          }
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

        const df = displayOverrides.fields as Record<
          KeysOfUnion<TextDisplay | HtmlDisplay>,
          Control<any>
        >;

        createScopedEffect((c) => {
          const textDisplay =
            isDisplayControl(def) && isTextDisplay(def.displayData)
              ? def.displayData
              : undefined;
          evalExpr(
            c,
            textDisplay?.text,
            df.text,
            textDisplay && firstExpr(formNode, DynamicPropertyType.Display),
            coerceString,
          );
        }, displayOverrides);

        createScopedEffect((c) => {
          const htmlDisplay =
            isDisplayControl(def) && isHtmlDisplay(def.displayData)
              ? def.displayData
              : undefined;
          evalExpr(
            c,
            htmlDisplay?.html,
            df.html,
            htmlDisplay && firstExpr(formNode, DynamicPropertyType.Display),
            coerceString,
          );
        }, displayOverrides);

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
          formData: {},
          displayOnly: false,
          inline: false,
        });

        const {
          dataNode,
          hidden,
          readonly,
          style,
          layoutStyle,
          allowedOptions,
          disabled,
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

        updateComputedValue(dataNode, () => lookupDataNode(definition, parent));
        updateComputedValue(
          hidden,
          () =>
            !!cf.hidden.value ||
            definition.hidden ||
            (dataNode.value && !validDataNode(dataNode.value)),
        );
        updateComputedValue(
          readonly,
          () => !!cf.readonly.value || isControlReadonly(definition),
        );
        updateComputedValue(
          disabled,
          () => !!cf.disabled.value || isControlDisabled(definition),
        );

        createSyncEffect(() => {
          const dn = dataNode.value;
          if (dn) {
            dn.control.disabled = disabled.value;
          }
        }, scope);

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

function createOverrideProxy<A extends object, B extends Record<string, any>>(
  proxyFor: A,
  handlers: Control<B>,
): A {
  return new Proxy(proxyFor, {
    get(target: A, p: string | symbol, receiver: any): any {
      const override = getExistingField(handlers, p as string);
      if (override) {
        return override.value;
      }
      return target[p as keyof A];
    },
  });
}

type KeysOfUnion<T> = T extends T ? keyof T : never;
