import useResizeObserver from "use-resize-observer";
import { NodeRendererProps, Tree } from "react-arborist";
import { addElement, Control, trackedValue } from "@react-typed-forms/core";
import {
  ControlDefinitionForm,
  toControlDefinitionForm,
} from "./schemaSchemas";
import React from "react";
import clsx from "clsx";
import {
  defaultControlForField,
  fieldPathForDefinition,
  FieldType,
  getSchemaNodePath,
  isCompoundNode,
  schemaForFieldPath,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { SelectedControlNode } from "./types";
import { schemaNodeIcon } from "./util";

interface SchemaNodeCtx {
  schema: SchemaNode;
  selectedControl: Control<SelectedControlNode | undefined>;
  rootControls: Control<ControlDefinitionForm[]>;
  id: string;
}

interface FormSchemaTreeProps {
  className?: string;
  rootSchema: SchemaNode;
  rootControls: Control<ControlDefinitionForm[]>;
  selectedControl: Control<SelectedControlNode | undefined>;
  selected: Control<SchemaNode | undefined>;
}

export function FormSchemaTree({
  rootSchema,
  selected,
  className,
  rootControls,
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
    return n.getChildNodes(true).map((x) => ({
      schema: x,
      selectedControl,
      id: getNodeId(x),
      rootControls,
    }));
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
  let parentSelected = false;
  if (sel) {
    const schemaPath = fieldPathForDefinition(trackedValue(sel.control));
    let schema = sel.schema;
    if (schemaPath) {
      schema = schemaForFieldPath(schemaPath, schema);
    }
    parentSelected = getNodeId(node.data.schema.parent!) == getNodeId(schema);
  } else {
    parentSelected = getNodeId(node.data.schema.parent!) == "";
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
      <i
        className={clsx("fa-solid w-4 h-4 mr-2", schemaNodeIcon(field.type))}
      />
      <span className="truncate">{field.field}</span>
      {parentSelected && (
        <i
          className="ml-2 fa-solid fa-plus w-4 h-4"
          onClick={async (e) => {
            e.stopPropagation();
            const sc = selectedControl.value;
            const parent = sc
              ? sc.control.fields.children
              : node.data.rootControls;
            addElement(
              parent,
              toControlDefinitionForm(
                defaultControlForField(node.data.schema.field),
              ),
            );
          }}
        />
      )}
    </div>
  );
}
