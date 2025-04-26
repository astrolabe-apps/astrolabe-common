import { FormNode, lookupDataNode } from "./formNode";
import { SchemaDataNode, validDataNode } from "./schemaDataNode";
import {
  ControlDefinition,
  DynamicPropertyType,
  getJsonPath,
  isControlDisabled,
  isControlReadonly,
} from "./controlDefinition";
import { SchemaInterface } from "./schemaInterface";
import { FieldOption } from "./schemaField";
import {
  addDependent,
  cleanupControl,
  clearMetaValue,
  Control,
  createEffect,
  ensureMetaValue,
  getControlPath,
  newControl,
  updateComputedValue,
  withChildren,
} from "@astroapps/controls";
import { defaultEvaluators, ExpressionEval } from "./evalExpression";
import { EntityExpression } from "./entityExpression";
import { jsonPathString, newScopedControl } from "./util";
import { createValidators, setupValidation } from "./validators";

export interface ControlState {
  definition: ControlDefinition;
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

export type ControlLogics = Record<string, ControlLogic<any>>;

export type ControlLogic<T> = (
  control: Control<any>,
  context: Control<FormContextOptions>,
  parent: SchemaDataNode,
  formNode: FormNode,
  evalExpr: (expr: EntityExpression, coerce: (v: unknown) => T) => void,
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
      return ensureMetaValue(controlImpl, "impl", () => {
        const dataNode = newScopedControl(controlImpl, () =>
          lookupDataNode(formNode.definition, parent),
        );
        const handlers: Record<string, Control<any>> = {};
        for (const k in logics) {
          const nk = newControl<any>(undefined);
          addDependent(controlImpl, nk);
          const evalExpr: (
            expr: EntityExpression,
            coerce: (t: unknown) => any,
          ) => void = (e, coerce) => {
            const x = evaluators[e.type];
            if (x) {
              x(e, nk, {
                coerce,
                dataNode: parent,
                formContext: controlImpl,
                schemaInterface,
              });
            }
          };
          logics[k](nk, controlImpl, parent, formNode, evalExpr);
          handlers[k] = nk;
        }
        const definition: ControlDefinition = new Proxy(formNode.definition, {
          get(
            target: ControlDefinition,
            p: string | symbol,
            receiver: any,
          ): any {
            const override = handlers[p as string];
            if (override) return override.value;
            return target[p as keyof ControlDefinition];
          },
        });
        setupValidation(
          controlImpl,
          definition,
          dataNode,
          schemaInterface,
          parent,
          formNode,
        );
        return { definition };
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
  if (dynamic) {
    evalExpr(dynamic, (r) => context.fields.hidden.value || !r);
  } else
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
  if (dynamic) {
    evalExpr(dynamic, (r) => context.fields.readonly.value || !!r);
  } else {
    updateComputedValue(
      control,
      () => context.fields.readonly.value || isControlReadonly(def),
    );
  }
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
  if (dynamic) {
    evalExpr(dynamic, (r) => context.fields.disabled.value || !!r);
  } else {
    updateComputedValue(
      control,
      () => context.fields.disabled.value || isControlDisabled(def),
    );
  }
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
  if (dynamic) {
    evalExpr(dynamic, (r) =>
      typeof r === "string" ? r : (r?.toString() ?? ""),
    );
  } else {
    updateComputedValue(control, () => def.title);
  }
};

const logics: ControlLogics = {
  hidden: hiddenLogic,
  readonly: readonlyLogic,
  disabled: disabledLogic,
  title: titleLogic,
};
