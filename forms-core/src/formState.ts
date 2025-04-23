import { fieldPathForDefinition, FormNode, lookupDataNode } from "./formNode";
import { schemaDataForFieldPath, SchemaDataNode } from "./schemaDataNode";
import {
  AnyControlDefinition,
  ControlDefinition,
  DynamicPropertyType,
  isDataControl,
} from "./controlDefinition";
import { SchemaInterface } from "./schemaInterface";
import { FieldOption } from "./schemaField";
import {
  Control,
  ensureMetaValue,
  newControl,
  updateComputedValue,
} from "@astroapps/controls";
import { evalExpression } from "./evalExpression";

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
  schemaInterface?: SchemaInterface;
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
}

export type ControlLogics = {
  [K in keyof AnyControlDefinition]?: ControlLogic<AnyControlDefinition[K]>;
};

export type ControlLogic<T> = (
  control: Control<T>,
  context: Control<FormContextOptions>,
  parent: SchemaDataNode,
  formNode: FormNode,
) => void;

export function createFormState(): FormState {
  const controlStates = newControl<Record<string, FormContextOptions>>({});
  return {
    getControlState(
      parent: SchemaDataNode,
      formNode: FormNode,
      context: FormContextOptions,
    ): ControlState {
      const controlImpl = controlStates.fields[parent.id + "$" + formNode.id];
      controlImpl.value = context;
      return ensureMetaValue(controlImpl, "impl", () => {
        const handlers: Record<string, Control<any>> = {};
        for (const k in logics) {
          const l = logics[k as keyof ControlLogics]! as ControlLogic<any>;
          const nk = newControl<any>(undefined);
          l(nk, controlImpl, parent, formNode);
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

const hiddenLogic: ControlLogic<boolean | null | undefined> = (
  hidden,
  context,
  parent,
  formNode,
) => {
  const dynamic = formNode.definition.dynamic?.find(
    (x) => x.type === DynamicPropertyType.Visible,
  );
  if (dynamic) {
    evalExpression(hidden, dynamic.expr, notBoolean, parent, formNode, context);
  } else
    updateComputedValue(hidden, () => {
      const dataNode = lookupDataNode(formNode.definition, parent);
      return !!dataNode && !validDataNode(dataNode);
    });
};

const logics: ControlLogics = { hidden: hiddenLogic };

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

function toBoolean(u: unknown) {
  return !!u;
}

function notBoolean(u: unknown) {
  return !u;
}
