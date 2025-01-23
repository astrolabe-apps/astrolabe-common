import {
  ControlDefinitionExtension,
  createDataRenderer,
  getSchemaNodePath,
  isCompoundNode,
  relativePath,
  RenderOptions,
  schemaForFieldRef,
  SchemaNode,
} from "@react-typed-forms/schemas";
import React, { useRef } from "react";
import { Control, RenderOptional, useControl } from "@react-typed-forms/core";
import {
  Button,
  createOverlayState,
  ModalDialog,
  Popover,
} from "@astroapps/aria-base";

import { NodeRendererProps, Tree } from "react-arborist";
import clsx from "clsx";
import useResizeObserver from "use-resize-observer";
import { schemaNodeIcon } from "./util";

const RenderType = "FieldSelection";

export interface FieldSelectionRenderOptions extends RenderOptions {
  type: typeof RenderType;
}

export const FieldSelectionExtension: ControlDefinitionExtension = {
  RenderOptions: {
    value: RenderType,
    name: "Field Selection",
  },
};

export interface FieldSelectionOptions {
  schema: SchemaNode;
}

interface NodeCtx {
  schema: SchemaNode;
  id: string;
}

export function createFieldSelectionRenderer({
  schema,
}: FieldSelectionOptions) {
  return createDataRenderer(
    (props) => {
      return (
        <FieldSelection
          schema={schema}
          control={props.control as Control<string | undefined>}
        />
      );
    },
    {
      renderType: RenderType,
    },
  );
}

export function FieldSelection({
  schema,
  control,
}: {
  schema: SchemaNode;
  control: Control<string | undefined>;
}) {
  const open = useControl(false);
  const term = useControl("");
  const selNode = schemaForFieldRef(control.value, schema);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  return (
    <>
      <div
        className={
          "w-full border-primary-500 border rounded p-2 hover:cursor-pointer min-h-[42px]"
        }
        onClick={() => (open.value = true)}
        ref={triggerRef}
      >
        <RenderOptional
          control={control}
          notDefined={<span className={"text-gray-500"}>Please select</span>}
        >
          {(c) => (
            <span>
              {selNode.field.displayName} ({c.value})
            </span>
          )}
        </RenderOptional>
      </div>
      {open.value && (
        <Popover
          state={createOverlayState(open)}
          triggerRef={triggerRef}
          placement="top left"
        >
          <div
            className={
              "flex flex-col gap-2 min-w-[500px] border border-black p-2"
            }
          >
            <input
              className={"w-full"}
              value={term.value}
              onChange={(e) => (term.value = e.target.value)}
              placeholder={"Search node(s)"}
            />
            <NodeSchemaTree
              schemaNode={schema}
              selectedField={control}
              term={term}
            />
          </div>
        </Popover>
      )}
    </>
  );
  // return (
  //   <ModalDialog
  //     isOpen={open.value}
  //     onOpenChange={(v: boolean) => (open.value = v)}
  //     title={"Field Selection"}
  //     trigger={
  //
  //     }
  //     footer={
  //       <div className={"w-full flex justify-end"}>
  //         <Button
  //           className={
  //             "bg-primary-500 hover:bg-primary-600 px-4 py-2 rounded text-white"
  //           }
  //           onPress={() => (open.value = false)}
  //         >
  //           Close
  //         </Button>
  //       </div>
  //     }
  //   >
  //   </ModalDialog>
  // );
}

function NodeSchemaTree({
  schemaNode,
  selectedField,
  term,
}: {
  schemaNode: SchemaNode;
  selectedField: Control<string | undefined>;
  term: Control<string>;
}) {
  const { ref, width, height } = useResizeObserver();
  const allNodes = makeChildNodes(schemaNode);

  return (
    <div className={"grow"} ref={ref}>
      <Tree<NodeCtx>
        width={width}
        height={height}
        data={allNodes}
        children={(n) =>
          NodeRenderer({
            ...n,
            schemaNode: schemaNode,
            selection: selectedField.value,
          })
        }
        onSelect={(n) => {
          if (n.length === 0) return;
          const currentSchema = n.at(0)?.data.schema;
          if (currentSchema) {
            selectedField.value = relativePath(schemaNode, currentSchema);
          }
        }}
        childrenAccessor={(x) => {
          return isCompoundNode(x.schema) && !x.schema.field.collection
            ? makeChildNodes(x.schema)
            : null;
        }}
        selection={selectedField.value}
        searchTerm={term.value}
        searchMatch={(node, term) =>
          node.data.schema.field.field
            ?.toLowerCase()
            .includes(term.toLowerCase()) ?? false
        }
        disableDrag
        disableDrop
        disableEdit
        disableMultiSelection
      />
    </div>
  );

  function makeChildNodes(n: SchemaNode): NodeCtx[] {
    return n.getChildNodes(true).map((x) => ({
      schema: x,
      id: getNodeId(x),
    }));
  }
}

function getNodeId(node: SchemaNode): string {
  return getSchemaNodePath(node).join("/");
}

function NodeRenderer({
  node,
  style,
  schemaNode,
  selection,
}: NodeRendererProps<NodeCtx> & {
  schemaNode: SchemaNode;
  selection?: string;
}) {
  const nodeSchema = node.data.schema;
  const isSelected = selection === relativePath(schemaNode, nodeSchema);

  return (
    <div
      style={style}
      className={clsx(
        "flex flex-row gap-1 items-center rounded hover:bg-primary-100 hover:cursor-pointer text-nowrap",
        isSelected && "bg-primary-200 hover:bg-primary-200",
      )}
    >
      <span
        className="w-4 mr-2 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          node.isInternal && node.toggle();
        }}
      >
        {node.isInternal && (
          <i
            className={clsx(
              "w-4 fa-solid",
              node.isOpen ? "fa-chevron-down" : "fa-chevron-right",
            )}
          />
        )}
      </span>
      <div>
        <i
          className={clsx(
            "fa-solid w-4 h-4 mr-2",
            schemaNodeIcon(nodeSchema.field.type),
          )}
        />
        <span>
          {node.data.schema.field.displayName} ({node.data.schema.field.field})
        </span>
      </div>
    </div>
  );
}
