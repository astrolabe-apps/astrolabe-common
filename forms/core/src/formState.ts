import { FormNode } from "./formNode";
import { SchemaDataNode } from "./schemaDataNode";
import { SchemaInterface } from "./schemaInterface";
import { FieldOption } from "./schemaField";
import {
  ChangeListenerFunc,
  CleanupScope,
  Control,
  createScopedEffect,
  ensureMetaValue,
  getControlPath,
  getCurrentFields,
  getMetaValue,
  newControl,
  unsafeRestoreControl,
} from "@astroapps/controls";
import {
  defaultEvaluators,
  ExpressionEval,
  ExpressionEvalContext,
} from "./evalExpression";
import { EntityExpression } from "./entityExpression";
import { createScoped, jsonPathString } from "./util";
import {
  createFormStateNode,
  FormContextOptions,
  FormStateNode,
} from "./evaluateForm";
import { ControlDefinition } from "./controlDefinition";

export interface ControlState {
  schemaInterface: SchemaInterface;
  definition: ControlDefinition;
  dataNode?: SchemaDataNode | undefined;
  display?: string;
  style?: object;
  layoutStyle?: object;
  allowedOptions?: any[];
  valid: boolean;
  touched: boolean;
  readonly: boolean;
  hidden: boolean;
  disabled: boolean;
  clearHidden: boolean;
  variables?: (changes: ChangeListenerFunc<any>) => Record<string, any>;
  meta: Record<string, any>;
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

      return createScopedMetaValue(formNode, controlImpl, "impl", (scope) => {
        const node = createFormStateNode(formNode, parent, {
          schemaInterface,
          runAsync,
          evalExpression,
          contextOptions: controlImpl.value,
        });
        return new ControlStateImpl(node);
      });
    },
  };
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

class ControlStateImpl implements ControlState {
  constructor(private node: FormStateNode) {}

  get dataNode() {
    return this.node.dataNode;
  }

  get clearHidden(): boolean {
    return this.node.clearHidden;
  }

  get definition(): ControlDefinition {
    return this.node.resolved?.definition!;
  }

  get disabled(): boolean {
    return this.node.disabled;
  }

  get hidden(): boolean {
    return this.node.hidden;
  }

  get meta(): Record<string, any> {
    return this.node.meta;
  }

  get readonly(): boolean {
    return this.node.readonly;
  }

  get schemaInterface(): SchemaInterface {
    return this.node.schemaInterface;
  }

  get touched(): boolean {
    return this.node.touched;
  }

  get valid(): boolean {
    return this.node.valid;
  }

  get variables() {
    return this.node.variables;
  }
}
