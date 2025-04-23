import { fieldPathForDefinition, FormNode, lookupDataNode } from "./formNode";
import { schemaDataForFieldPath, SchemaDataNode } from "./schemaDataNode";
import {
  AnyControlDefinition,
  ControlDefinition,
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

export type ControlOverride<K extends keyof AnyControlDefinition> = [
  K,
  Control<AnyControlDefinition[K]>,
];

export type ControlOverrides = {
  [K in keyof AnyControlDefinition]: Control<AnyControlDefinition[K]>;
};

export type ControlLogic = (
  context: Control<FormContextOptions>,
  parent: SchemaDataNode,
  formNode: FormNode,
) => ControlOverride<any> | undefined;

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
        const handlers = newControl({}) as Control<ControlOverrides>;
        updateComputedValue(handlers, () => {
          const out: Record<string, Control<any>> = {};
          logics.forEach((x) => {
            const result = x(controlImpl, parent, formNode);
            if (result) out[result[0]] = result[1];
          });
          return out as ControlOverrides;
        });
        return {
          definition: new Proxy(formNode.definition, {
            get(
              target: ControlDefinition,
              p: string | symbol,
              receiver: any,
            ): any {
              const override = handlers.value[p as keyof AnyControlDefinition];
              if (override) return override.value;
              return target[p as keyof ControlDefinition];
            },
          }),
        };
      });
    },
  };
}

const testLogic: ControlLogic = (context, parent, formNode) => {
  const hidden = newControl(false);
  updateComputedValue(hidden, () => {
    const dataNode = lookupDataNode(formNode.definition, parent);
    return !!dataNode && !validDataNode(dataNode);
  });
  return ["hidden", hidden];
};

const logics: ControlLogic[] = [testLogic];

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
