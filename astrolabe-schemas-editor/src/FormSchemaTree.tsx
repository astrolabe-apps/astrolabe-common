import useResizeObserver from "use-resize-observer";
import { NodeRendererProps, Tree } from "react-arborist";
import { Control } from "@react-typed-forms/core";
import React from "react";
import clsx from "clsx";
import {
  fieldPathForDefinition,
  getSchemaNodePath,
  isCompoundNode,
  schemaForFieldPath,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { SelectedControlNode } from "./types";
import { schemaNodeIcon } from "./util";
import { StdTreeNode } from "./StdTreeNode";

interface SchemaNodeCtx {
  schema: SchemaNode;
  selectedControl: Control<SelectedControlNode | undefined>;
  onAdd: (node: SchemaNode) => void;
  id: string;
}

interface FormSchemaTreeProps {
  className?: string;
  rootSchema: SchemaNode;
  onAdd: (node: SchemaNode) => void;
  selectedControl: Control<SelectedControlNode | undefined>;
  selected: Control<SchemaNode | undefined>;
}

export function FormSchemaTree({
  rootSchema,
  selected,
  className,
  selectedControl,
  onAdd,
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
    const parent = n.getResolvedParent(true);
    const childNodes =
      parent?.getUnresolvedFields().map((x) => n.createChildNode(x)) ?? [];
    return childNodes.map((x) => {
      return {
        schema: x,
        selectedControl,
        id: getNodeId(x),
        onAdd,
      };
    });
  }
}

function getNodeId(node: SchemaNode): string {
  return getSchemaNodePath(node).join("/");
}

function SchemaNodeRenderer(props: NodeRendererProps<SchemaNodeCtx>) {
  const { node } = props;
  const {
    schema: { field },
    selectedControl,
  } = node.data;
  const sel = selectedControl.value;
  let parentSelected = false;
  if (sel) {
    const schemaPath = fieldPathForDefinition(sel.form.definition);
    let schema = sel.schema;
    if (schemaPath) {
      schema = schemaForFieldPath(schemaPath, schema);
    }
    parentSelected = getNodeId(node.data.schema.parent!) == getNodeId(schema);
  } else {
    parentSelected = getNodeId(node.data.schema.parent!) == "";
  }
  return (
    <StdTreeNode {...props}>
      <i
        className={clsx("fa-solid w-4 h-4 mr-2", schemaNodeIcon(field.type))}
      />
      <span className="truncate">
        {field.field}
        {field.collection ? " []" : ""}
      </span>
      {parentSelected && (
        <i
          className="ml-2 fa-solid fa-plus w-4 h-4"
          onClick={(e) => {
            e.stopPropagation();
            node.data.onAdd(node.data.schema);
          }}
        />
      )}
    </StdTreeNode>
  );
}
