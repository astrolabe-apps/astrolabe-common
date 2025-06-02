"use client";
import {
  createFormLookup,
  createFormTree,
  createSchemaLookup,
  FormNode,
} from "@astroapps/forms-core";
import { OptionForm, TestSchema } from "../../setup/testOptionTree";
import { ControlNode, JsonEditor } from "@astroapps/schemas-editor";
import useResizeObserver from "use-resize-observer";
import { NodeRendererProps, Tree } from "react-arborist";
import React, { ReactNode } from "react";
import clsx from "clsx";
import { Control, RenderOptional, useControl } from "@react-typed-forms/core";

const schemaLookup = createSchemaLookup({ TestSchema });
const Form = createFormTree([OptionForm]);

export default function FormDataTreePage() {
  const { ref, width, height } = useResizeObserver();
  const selected = useControl<FormNode | undefined>();
  const data = useControl({});
  const jsonText = useControl(() =>
    JSON.stringify(data.current.value, null, 2),
  );
  return (
    <div className="flex flex-col h-full">
      <div className="h-64">
        <JsonEditor control={jsonText} />
      </div>
      <div className="flex grow">
        <div className="w-96 border" ref={ref}>
          <Tree<FormNode>
            width={width}
            height={height}
            onSelect={(n) => (selected.value = n[0]?.data)}
            data={Form.rootNode.getChildNodes()}
            childrenAccessor={(n) => n.getChildNodes()}
            children={FormNodeRenderer}
          />
        </div>
        <div className="w-[33vw] border grow">
          <RenderOptional control={selected}>
            {(c) => <CurrentNode node={c} />}
          </RenderOptional>
        </div>
      </div>
    </div>
  );
}

function CurrentNode({ node }: { node: Control<FormNode> }) {
  const n = node.value;
  const { children, ...def } = n.definition;
  return <pre>{JSON.stringify(def, null, 2)}</pre>;
}
function FormNodeRenderer({
  style,
  dragHandle,
  node,
}: NodeRendererProps<FormNode>) {
  return (
    <div
      style={style}
      ref={dragHandle}
      className={clsx(
        "flex cursor-pointer items-center",
        node.isSelected && "bg-primary-100",
      )}
      onClick={() => node.isInternal && node.open()}
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
      {node.data.definition.type} - {node.data.definition.title}
    </div>
  );
}
