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
  defaultSchemaFieldForm,
  SchemaFieldForm,
} from "./schemaSchemas";
import React, { createContext } from "react";
import clsx from "clsx";
import {
  ControlDefinitionType,
  fieldPathForDefinition,
  FieldType,
  getSchemaNodePath,
  isCompoundField,
  isCompoundNode,
  schemaForFieldPath,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { ControlNode } from "./types";

interface SchemaNodeCtx {
  schema: SchemaNode;
  selectedControl: Control<ControlNode | undefined>;
  id: string;
}
interface FormSchemaTreeProps {
  className?: string;
  rootSchema: SchemaNode;
  selectedControl: Control<ControlNode | undefined>;
  selected: Control<SchemaNode | undefined>;
}

export function FormSchemaTree({
  rootSchema,
  selected,
  className,
  selectedControl,
}: FormSchemaTreeProps) {
  const { ref, width, height } = useResizeObserver();

  return (
    <div className={className} ref={ref}>
      <Tree<SchemaNodeCtx>
        width={width}
        height={height}
        data={makeChildNodes(rootSchema)}
        onSelect={(n) => (selected.value = n[0]?.data.schema)}
        selection={selected.value ? getNodeId(selected.value) : undefined}
        childrenAccessor={(x) =>
          isCompoundNode(x.schema) ? makeChildNodes(x.schema) : null
        }
        children={SchemaNodeRenderer}
      />
    </div>
  );

  function makeChildNodes(n: SchemaNode): SchemaNodeCtx[] {
    return n
      .getChildNodes()
      .map((x) => ({ schema: x, selectedControl, id: getNodeId(x) }));
  }
}

function getNodeId(node: SchemaNode): string {
  return getSchemaNodePath(node).join("/");
}

function SchemaNodeRenderer({
  node,
  style,
  dragHandle,
}: NodeRendererProps<SchemaNodeCtx>) {
  const {
    schema: { field },
    selectedControl,
  } = node.data;
  const sel = selectedControl.value;
  if (sel) {
    const schemaPath = fieldPathForDefinition(trackedValue(sel.control));
    let schema = sel.schema;
    if (schemaPath) {
      schema = schemaForFieldPath(schemaPath, schema);
    }
    console.log({ sel: getNodeId(schema), this: node.id });
  }
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
      <i className={clsx("fa-solid w-4 h-4 mr-2", nodeIcon(field.type))} />
      <span>{field.field}</span>
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
