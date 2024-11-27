import useResizeObserver from "use-resize-observer";
import { MoveHandler, NodeApi, NodeRendererProps, Tree } from "react-arborist";
import {
  addElement,
  Control,
  groupedChanges,
  removeElement,
  trackedValue,
  updateElements,
} from "@react-typed-forms/core";
import {
  ControlDefinitionForm,
  defaultControlDefinitionForm,
} from "./schemaSchemas";
import React from "react";
import clsx from "clsx";
import {
  ControlDefinitionType,
  fieldPathForDefinition,
  getSchemaNodePath,
  schemaForFieldPath,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { ControlNode } from "./types";

export interface FormControlTreeProps {
  className?: string;
  controls: Control<ControlDefinitionForm[]>;
  rootSchema: SchemaNode;
  selected: Control<ControlNode | undefined>;
  selectedField: Control<SchemaNode | undefined>;
  onDeleted: (n: NodeApi<ControlNode>) => void;
}

export function FormControlTree({
  controls,
  selected,
  rootSchema,
  selectedField,
  onDeleted,
  className,
}: FormControlTreeProps) {
  const { ref, width, height } = useResizeObserver();

  const doMove: MoveHandler<ControlNode> = (props) => {
    groupedChanges(() => {
      const parentChildren =
        props.parentId === null
          ? controls
          : props.parentNode?.data?.control.fields.children;
      if (parentChildren) {
        props.dragNodes.forEach((x) => {
          const parentControl =
            x.level === 0 ? controls : x.parent!.data.control.fields.children;
          if (parentControl) {
            updateElements(parentControl, (e) =>
              e.filter((c) => c !== x.data.control),
            );
          }
        });
        updateElements(parentChildren, (e) => {
          const c = [...e];
          c.splice(
            props.index,
            0,
            ...props.dragNodes.map((x) => x.data.control),
          );
          return c;
        });
      }
    });
  };

  return (
    <div className={className} ref={ref}>
      <Tree<ControlNode>
        width={width}
        height={height}
        onSelect={(n) => {
          const f = n[0];
          if (f) {
            selected.value = f.data;
            const schemaPath = fieldPathForDefinition(
              trackedValue(f.data.control),
            );
            if (schemaPath) {
              selectedField.value = schemaForFieldPath(
                schemaPath,
                f.data.schema,
              );
            }
          }
        }}
        data={controls.elements.map((x) => ({
          control: x,
          schema: rootSchema,
        }))}
        selection={selected.value?.control.uniqueId.toString()}
        childrenAccessor={(x) => {
          const c = x.control.fields.children.elements;
          const childPath = fieldPathForDefinition(trackedValue(x.control));
          const schema = childPath
            ? schemaForFieldPath(childPath, x.schema)
            : x.schema;
          return c && c.length > 0
            ? c.map((d) => ({
                control: d,
                schema,
              }))
            : null;
        }}
        idAccessor={(x) => x.control.uniqueId.toString()}
        children={ControlNodeRenderer}
        onCreate={(props) => {
          if (props.parentNode) {
            const childElements = props.parentNode.data.control.fields.children;
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
            const parentElements =
              x.level == 0 ? controls : x.parent!.data?.control.fields.children;
            if (parentElements) {
              removeElement(parentElements, x.data.control);
              onDeleted(x);
            }
          });
        }}
      />
    </div>
  );
}

function ControlNodeRenderer({
  node,
  style,
  dragHandle,
}: NodeRendererProps<ControlNode>) {
  const canAdd = true;
  const canDelete = true;
  const control = node.data.control;
  return (
    <div
      style={style}
      ref={dragHandle}
      className={clsx("flex items-center", node.isSelected && "bg-primary-100")}
      onClick={() => node.isInternal && node.toggle()}
    >
      <span className="w-4 mr-2">
        {node.isInternal && (
          <i
            className={clsx(
              "w-4 fa-solid",
              node.isOpen ? "fa-chevron-down" : "fa-chevron-right",
            )}
          />
        )}
      </span>
      <i
        className={clsx(
          "fa-solid w-4 h-4 mr-2",
          nodeIcon(control.fields.type.value),
        )}
      />
      <span>{control.fields.title.value}</span>
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
    </div>
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
