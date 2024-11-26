import useResizeObserver from "use-resize-observer";
import { MoveHandler, NodeApi, NodeRendererProps, Tree } from "react-arborist";
import {
  addElement,
  Control,
  groupedChanges,
  removeElement,
  updateElements,
} from "@react-typed-forms/core";
import {
  ControlDefinitionForm,
  defaultControlDefinitionForm,
  defaultSchemaFieldForm,
  SchemaFieldForm,
} from "./schemaSchemas";
import React from "react";
import clsx from "clsx";
import { ControlDefinitionType, FieldType } from "@react-typed-forms/schemas";

interface FormSchemaTreeProps {
  className?: string;
  controls: Control<SchemaFieldForm[]>;
  onDeleted: (n: NodeApi<Control<SchemaFieldForm>>) => void;
}

export function FormSchemaTree({
  controls,
  onDeleted,
  className,
}: FormSchemaTreeProps) {
  const { ref, width, height } = useResizeObserver();

  const doMove: MoveHandler<Control<SchemaFieldForm>> = (props) => {
    groupedChanges(() => {
      const parentChildren =
        props.parentId === null
          ? controls
          : props.parentNode?.data?.fields.children;
      if (parentChildren) {
        props.dragNodes.forEach((x) => {
          const parentControl =
            x.level === 0 ? controls : x.parent!.data.fields.children;
          if (parentControl) {
            updateElements(parentControl, (e) => e.filter((c) => c !== x.data));
          }
        });
        updateElements(parentChildren, (e) => {
          const c = [...e];
          c.splice(props.index, 0, ...props.dragNodes.map((x) => x.data));
          return c;
        });
      }
    });
  };

  return (
    <div className={className} ref={ref}>
      <Tree<Control<SchemaFieldForm>>
        width={width}
        height={height}
        data={controls.elements}
        childrenAccessor={(x) => {
          const c = x.fields.children.elements;
          return c && c.length > 0 ? c : null;
        }}
        idAccessor={(x) => x.uniqueId.toString()}
        children={ControlNode}
        onCreate={(props) => {
          if (props.parentNode) {
            const childElements = props.parentNode.data.fields.children;
            if (childElements) {
              const c = addElement(childElements, defaultSchemaFieldForm);
              return { id: c.uniqueId.toString() };
            }
          }
          return null;
        }}
        onMove={doMove}
        onDelete={(props) => {
          props.nodes.forEach((x) => {
            const parentElements =
              x.level == 0 ? controls : x.parent!.data?.fields.children;
            if (parentElements) {
              removeElement(parentElements, x.data);
              onDeleted(x);
            }
          });
        }}
      />
    </div>
  );
}

function ControlNode({
  node,
  style,
  dragHandle,
}: NodeRendererProps<Control<SchemaFieldForm>>) {
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
          nodeIcon(node.data.fields.type.value),
        )}
      />
      <span>{node.data.fields.field.value}</span>
    </div>
  );

  function nodeIcon(t: string) {
    switch (t) {
      case FieldType.String:
        return "fa-text";
      case FieldType.Int:
      case FieldType.Double:
        return "fa-0";
      case FieldType.Compound:
        return "fa-brackets-curly";
      case FieldType.Bool:
        return "fa-y";
      default:
        return "fa-question";
    }
  }
}
