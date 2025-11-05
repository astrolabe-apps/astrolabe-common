import {
  ChangeListenerFunc,
  CleanupScope,
  Control,
  trackedValue,
} from "@astroapps/controls";
import {
  ControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  GroupedControlsDefinition,
  GroupRenderType,
  isDataControl,
} from "./controlDefinition";
import { SchemaDataNode } from "./schemaDataNode";
import { FormNode } from "./formNode";
import { createScopedComputed } from "./util";
import { SchemaInterface } from "./schemaInterface";
import { FieldOption } from "./schemaField";
import { FormStateNode } from "./formStateNode";
import { groupedControl } from "./controlBuilder";

export type ChildResolverFunc = (c: FormStateNode) => ChildNodeSpec[];

export interface ChildNodeSpec {
  childKey: string | number;
  create: (scope: CleanupScope, meta: Record<string, any>) => ChildNodeInit;
}

export interface ChildNodeInit {
  definition?: ControlDefinition;
  parent?: SchemaDataNode;
  node?: FormNode | null;
  variables?: (changes: ChangeListenerFunc<any>) => Record<string, any>;
  resolveChildren?: ChildResolverFunc;
}

export function defaultResolveChildNodes(
  formStateNode: FormStateNode,
): ChildNodeSpec[] {
  const {
    resolved,
    dataNode: data,
    schemaInterface,
    parent,
    form: node,
  } = formStateNode;
  if (!node) return [];
  const def = resolved.definition;
  if (isDataControl(def)) {
    if (!data) return [];
    const type = def.renderOptions?.type;
    if (type === DataRenderType.CheckList || type === DataRenderType.Radio) {
      const n = node.getChildNodes();
      if (n.length > 0 && resolved.fieldOptions) {
        return resolved.fieldOptions.map((x) => ({
          childKey: x.value?.toString(),
          create: (scope, meta) => {
            meta["fieldOptionValue"] = x.value;
            const vars = createScopedComputed(scope, () => {
              return {
                option: x,
                optionSelected: isOptionSelected(schemaInterface, x, data),
              };
            });
            return {
              definition: {
                type: ControlDefinitionType.Group,
                groupOptions: {
                  type: GroupRenderType.Contents,
                },
              } as GroupedControlsDefinition,
              parent,
              node,
              variables: (changes) => ({
                formData: trackedValue(vars, changes),
              }),
            };
          },
        }));
      }
      return [];
    }
    if (data.schema.field.collection && data.elementIndex == null)
      return resolveArrayChildren(data, node);
  }
  return node.getChildNodes().map((x) => ({
    childKey: x.id,
    create: () => ({
      node: x,
      parent: data ?? parent,
      definition: x.definition,
    }),
  }));
}

export function resolveArrayChildren(
  data: SchemaDataNode,
  node: FormNode,
  adjustChild?: (elem: Control<any>, index: number) => Partial<ChildNodeInit>,
): ChildNodeSpec[] {
  const childNodes = node.getChildNodes();
  const childCount = childNodes.length;
  const singleChild = childCount === 1 ? childNodes[0] : null;
  return data.control.as<any[]>().elements.map((x, i) => ({
    childKey: x.uniqueId + "/" + i,
    create: () => ({
      definition: !childCount
        ? ({
            type: ControlDefinitionType.Data,
            field: ".",
            hideTitle: true,
            renderOptions: { type: DataRenderType.Standard },
          } as DataControlDefinition)
        : singleChild
          ? singleChild.definition
          : groupedControl([]),
      node: singleChild ?? node,
      parent: data!.getChildElement(i),
      ...(adjustChild?.(x, i) ?? {}),
    }),
  }));
}

function isOptionSelected(
  schemaInterface: SchemaInterface,
  option: FieldOption,
  data: SchemaDataNode,
) {
  if (data.schema.field.collection) {
    return !!data.control.as<any[] | undefined>().value?.includes(option.value);
  }
  return (
    schemaInterface.compareValue(
      data.schema.field,
      data.control.value,
      option.value,
    ) === 0
  );
}
