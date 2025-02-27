import useResizeObserver from "use-resize-observer";
import {
  MoveHandler,
  NodeApi,
  NodeRendererProps,
  Tree,
  TreeApi,
} from "react-arborist";
import {
  addElement,
  Control,
  groupedChanges,
  removeElement,
  trackedValue,
  unsafeRestoreControl,
  updateElements,
} from "@react-typed-forms/core";
import {
  ControlDefinitionForm,
  defaultControlDefinitionForm,
} from "./schemaSchemas";
import React, { MutableRefObject } from "react";
import clsx from "clsx";
import {
  ControlDefinition,
  ControlDefinitionType,
  fieldPathForDefinition,
  FormNode,
  getSchemaNodePath,
  isCompoundNode,
  isDataControl,
  schemaForFieldPath,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { ControlNode, SelectedControlNode } from "./types";
import { StdTreeNode } from "./StdTreeNode";
import { canAddChildren } from "./util";

export interface FormControlTreeProps {
  className?: string;
  rootNode: FormNode;
  rootSchema: SchemaNode;
  selectedControl: Control<SelectedControlNode | undefined>;
  selected: Control<string | undefined>;
  selectedField: Control<SchemaNode | undefined>;
  onDeleted: (n: NodeApi<ControlNode>) => void;
  treeApi?: MutableRefObject<TreeApi<ControlNode> | null>;
}

export function FormControlTree({
  rootNode,
  selected,
  selectedControl,
  rootSchema,
  selectedField,
  onDeleted,
  className,
  treeApi,
}: FormControlTreeProps) {
  const { ref, width, height } = useResizeObserver();

  const treeNodes = rootNode
    .getChildNodes()
    .map((x) => toControlNode(x, rootSchema));

  function getEditableChildren(
    x?: FormNode,
  ): Control<ControlDefinition[] | null | undefined> | undefined {
    return x && unsafeRestoreControl(x.definition)!.fields.children;
  }

  function getDefinitionControl(
    x: NodeApi<ControlNode>,
  ): Control<ControlDefinition> {
    return unsafeRestoreControl(x.data.form.definition)!;
  }

  const doMove: MoveHandler<ControlNode> = (props) => {
    groupedChanges(() => {
      const parentChildren =
        props.parentId === null
          ? getEditableChildren(rootNode)
          : getEditableChildren(props.parentNode?.data?.form);
      if (parentChildren) {
        props.dragNodes.forEach((x) => {
          const parentControl = getEditableChildren(
            x.level === 0 ? rootNode : x.parent!.data.form,
          );
          if (parentControl) {
            updateElements(parentControl, (e) =>
              e.filter((c) => c !== getDefinitionControl(x)),
            );
          }
        });
        updateElements(parentChildren, (e) => {
          const c = [...e];
          c.splice(
            props.index,
            0,
            ...props.dragNodes.map((x) => getDefinitionControl(x)),
          );
          return c;
        });
      }
    });
  };
  return (
    <div className={className} ref={ref}>
      <Tree<ControlNode>
        ref={treeApi}
        width={width}
        height={height}
        onSelect={onSelect}
        data={treeNodes}
        selection={selected.value}
        children={ControlNodeRenderer}
        onCreate={(props) => {
          if (props.parentNode) {
            const childElements = getEditableChildren(
              props.parentNode.data.form,
            );
            if (childElements) {
              const c = addElement(childElements, defaultControlDefinitionForm);
              return { id: c.uniqueId.toString() };
            }
          }
          return null;
        }}
        onMove={doMove}
        onDelete={(props) => {
          props.nodes.forEach((x) => {
            const parentElements = getEditableChildren(
              x.level == 0 ? rootNode : x.parent!.data?.form,
            );
            if (parentElements) {
              removeElement(parentElements, getDefinitionControl(x));
              onDeleted(x);
            }
          });
        }}
      />
    </div>
  );

  function onSelect(n: NodeApi<ControlNode>[]) {
    groupedChanges(() => {
      const f = n[0];
      selected.value = n[0]?.id;
      if (f) {
        selectedControl.value = {
          form: f.data.form,
          schema: f.data.schema,
        };
        const schemaPath = fieldPathForDefinition(f.data.form.definition);
        if (schemaPath) {
          selectedField.value = schemaForFieldPath(schemaPath, f.data.schema);
        }
      } else {
        selectedControl.value = undefined;
        selectedField.value = undefined;
      }
    });
  }

  function toControlNode(
    form: FormNode,
    parentSchema: SchemaNode,
  ): ControlNode {
    const def = form.definition;
    const childPath = fieldPathForDefinition(def);
    const dataSchema = childPath
      ? schemaForFieldPath(childPath, parentSchema)
      : undefined;
    const c = form.getChildNodes();
    const children =
      c.length == 0 && !canAddChildren(def, dataSchema)
        ? null
        : c.map((x) => toControlNode(x, dataSchema ?? parentSchema));
    return { id: form.id, form, dataSchema, schema: parentSchema, children };
  }
}

function ControlNodeRenderer(props: NodeRendererProps<ControlNode>) {
  const { node } = props;
  const canDelete = true;
  const control = node.data.form.definition;
  const canAdd = canAddChildren(control, node.data.dataSchema);
  return (
    <StdTreeNode {...props}>
      <i className={clsx("fa-solid w-4 h-4 mr-2", nodeIcon(control.type))} />
      <span className="truncate">
        {control.title}
        {isDataControl(control) ? (
          <span>
            {" "}
            <i>({control.field})</i>
          </span>
        ) : (
          ""
        )}
      </span>
      {canAdd && (
        <i
          className="ml-2 fa-solid fa-plus w-4 h-4"
          onClick={async (e) => {
            e.stopPropagation();
            await node.tree.create({ parentId: node.id });
          }}
        />
      )}
      {canDelete && (
        <i
          className="ml-2 fa-solid fa-remove w-4 h-4"
          onClick={async (e) => {
            e.stopPropagation();
            await node.tree.delete(node);
          }}
        />
      )}
    </StdTreeNode>
  );

  function nodeIcon(t: string) {
    switch (t) {
      case ControlDefinitionType.Data:
        return "fa-pen";
      case ControlDefinitionType.Display:
        return "fa-text";
      case ControlDefinitionType.Action:
        return "fa-bolt";
      case ControlDefinitionType.Group:
        return "fa-layer-group";
      default:
        return "fa-question";
    }
  }
}
