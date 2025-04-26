import { FormNode, lookupDataNode } from "./formNode";
import { SchemaDataNode } from "./schemaDataNode";
import {
  AnyControlDefinition,
  ControlDefinition,
  DynamicPropertyType,
  isControlDisabled,
  isControlReadonly,
  isDataControl,
} from "./controlDefinition";
import { SchemaInterface } from "./schemaInterface";
import { FieldOption } from "./schemaField";
import {
  cleanupControl,
  Control,
  ensureMetaValue,
  newControl,
  updateComputedValue,
} from "@astroapps/controls";
import { defaultEvaluators, ExpressionEval } from "./evalExpression";
import { EntityExpression } from "./entityExpression";
import { addDependent } from "@astroapps/controls";

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
  const controlStates = newControl<Record<string, FormContextOptions>>({});
  return {
    cleanup: () => cleanupControl(controlStates),
    getControlState(
      parent: SchemaDataNode,
      formNode: FormNode,
      context: FormContextOptions,
    ): ControlState {
      const controlImpl = controlStates.fields[parent.id + "$" + formNode.id];
      controlImpl.value = context;
      return ensureMetaValue(controlImpl, "impl", () => {
        addDependent(controlStates, controlImpl);
        const handlers: Record<string, Control<any>> = {};
        for (const k in logics) {
          const nk = newControl<any>(undefined);
          addDependent(controlStates, nk);
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
        return {
          definition: new Proxy(formNode.definition, {
            get(
              target: ControlDefinition,
              p: string | symbol,
              receiver: any,
            ): any {
              const override = handlers[p as string];
              if (override) return override.value;
              return target[p as keyof ControlDefinition];
            },
          }),
        };
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

export function validDataNode(context: SchemaDataNode): boolean {
  const parent = context.parent;
  if (!parent) return true;
  return ensureMetaValue(context.control, "validForSchema", () => {
    const c = newControl(true);
    updateComputedValue(c, () => {
      if (!validDataNode(parent)) return false;
      const types = context.schema.field.onlyForTypes;
      if (types == null || types.length === 0) return true;
      const typeNode = parent.schema
        .getChildNodes()
        .find((x) => x.field.isTypeField);
      if (typeNode == null) {
        console.warn("No type field found for", parent.schema);
        return false;
      }
      const typeField = parent.getChild(typeNode).control as Control<string>;
      return typeField && types.includes(typeField.value);
    });
    return c;
  }).value;
}
