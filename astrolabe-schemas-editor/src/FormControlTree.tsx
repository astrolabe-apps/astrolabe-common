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
} from "./schemaSchemas";
import React from "react";
import clsx from "clsx";
import { ControlDefinitionType } from "@react-typed-forms/schemas";

interface FormControlTreeProps {
  controls: Control<ControlDefinitionForm[]>;
  selected: Control<Control<any> | undefined>;
  onDeleted: (n: NodeApi<Control<ControlDefinitionForm>>) => void;
}

export function FormControlTree({
  controls,
  selected,
  onDeleted,
}: FormControlTreeProps) {
  const { ref, width, height } = useResizeObserver();

  const doMove: MoveHandler<Control<ControlDefinitionForm>> = (props) => {
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
    <div ref={ref}>
      <Tree<Control<ControlDefinitionForm>>
        width={width}
        height={height}
        onSelect={(n) => (selected.value = n[0]?.data)}
        data={controls.elements}
        childrenAccessor={(x) => x.fields.children.elements}
        idAccessor={(x) => x.uniqueId.toString()}
        children={ControlNode}
        onCreate={(props) => {
          if (props.parentNode) {
            const childElements = props.parentNode.data.fields.children;
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
}: NodeRendererProps<Control<ControlDefinitionForm>>) {
  const canAdd = true;
  const canDelete = true;
  return (
    <div
      style={style}
      ref={dragHandle}
      className={clsx(node.isSelected && "bg-primary-100")}
      onClick={() => node.isInternal && node.toggle()}
    >
      <span className="w-4">
        {node.isInternal && (
          <i
            className={clsx(
              "mr-2 fa-solid",
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
      <span>{node.data.fields.title.value}</span>
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
        return "fa-calculator";
      case ControlDefinitionType.Display:
        return "fa-plus-minus";
      case ControlDefinitionType.Action:
        return "fa-ruler";
      default:
        return "fa-equals";
    }
  }
}
