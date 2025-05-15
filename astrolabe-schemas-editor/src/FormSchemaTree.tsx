import useResizeObserver from "use-resize-observer";
import { NodeApi, NodeRendererProps, Tree, TreeApi } from "react-arborist";
import { addElement, Control } from "@react-typed-forms/core";
import React, { Key, MutableRefObject } from "react";
import clsx from "clsx";
import {
  fieldPathForDefinition,
  FieldType,
  getSchemaNodePath,
  isCompoundNode,
  schemaForFieldPath,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { ControlNode, SelectedControlNode } from "./types";
import { schemaNodeIcon } from "./util";
import { StdTreeNode } from "./StdTreeNode";
import { Button, MenuTrigger } from "react-aria-components";
import { Popover } from "./components/Popover";
import { Menu } from "./components/Menu";
import { MenuItem } from "./components/MenuItem";
import { EditorSchemaTree } from "./EditorSchemaTree";
import { defaultSchemaFieldForm } from "./schemaSchemas";

export interface SchemaNodeCtx {
  schema: SchemaNode;
  selected: Control<SchemaNode | undefined>;
  selectedControl: Control<SelectedControlNode | undefined>;
  onAdd: (node: SchemaNode) => void;
  id: string;
}

export interface FormSchemaTreeProps {
  className?: string;
  rootSchema: SchemaNode;
  onAdd: (node: SchemaNode) => void;
  selectedControl: Control<SelectedControlNode | undefined>;
  selected: Control<SchemaNode | undefined>;
  treeApi?: MutableRefObject<TreeApi<SchemaNodeCtx> | null>;
}

export function FormSchemaTree({
  rootSchema,
  selected,
  className,
  selectedControl,
  onAdd,
  treeApi,
}: FormSchemaTreeProps) {
  const { ref, width, height } = useResizeObserver();
  return (
    <div className={className} ref={ref}>
      <Tree<SchemaNodeCtx>
        width={width}
        height={height}
        ref={treeApi}
        data={makeChildNodes(rootSchema)}
        onSelect={(n) => (selected.value = n[0]?.data.schema)}
        selection={selected.value ? getNodeId(selected.value) : undefined}
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
        selected,
        children: isCompoundNode(x) ? makeChildNodes(x) : null,
      };
    });
  }
}

function getNodeId(node: SchemaNode): string {
  return node.id;
}

function SchemaNodeRenderer(props: NodeRendererProps<SchemaNodeCtx>) {
  const { node } = props;
  const {
    schema: { field },
  } = node.data;
  return (
    <StdTreeNode {...props}>
      <i
        className={clsx("fa-solid w-4 h-4 mr-2", schemaNodeIcon(field.type))}
      />
      <span className="truncate">
        {field.field}
        {field.collection ? " []" : ""}
      </span>
      <MenuTrigger>
        <Button>
          <i className="pl-2 fa fa-ellipsis-vertical text-xs" />
        </Button>
        <Popover>
          <FieldMenu node={node} />
        </Popover>
      </MenuTrigger>
    </StdTreeNode>
  );
}

function FieldMenu({ node }: { node: NodeApi<SchemaNodeCtx> }) {
  const { selectedControl, schema } = node.data;
  const tree = schema.tree as EditorSchemaTree;
  const sel = selectedControl.value;
  let parentSelected;
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
    <Menu onAction={doAction}>
      {parentSelected && <MenuItem id="addControl">Add to form</MenuItem>}
      {isCompoundNode(schema) && (
        <MenuItem id="addChild">Add child field</MenuItem>
      )}
      <MenuItem id="delete">Delete</MenuItem>
    </Menu>
  );

  function doAction(action: Key) {
    switch (action) {
      case "addControl":
        node.data.onAdd(schema);
        break;
      case "delete":
        tree.deleteNode(schema);
        break;
      case "addChild":
        const children = tree.getEditableChildren(schema);
        if (children) {
          const newNode = tree.addNode(schema, {
            ...defaultSchemaFieldForm,
            type: FieldType.String,
            field: "new",
          });
          node.data.selected.value = newNode;
        }
        break;
    }
  }
}
