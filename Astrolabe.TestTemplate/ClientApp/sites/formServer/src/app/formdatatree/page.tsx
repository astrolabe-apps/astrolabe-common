"use client";
import {
  createFormStateNode,
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  defaultEvaluators,
  defaultSchemaInterface,
  FormContextOptions,
  FormStateNode,
  isDataControl,
  ResolvedDefinition,
} from "@astroapps/forms-core";
import { JsonEditor } from "@astroapps/schemas-editor";
import useResizeObserver from "use-resize-observer";
import { NodeRendererProps, Tree } from "react-arborist";
import React, { useMemo } from "react";
import clsx from "clsx";
import {
  Control,
  RenderOptional,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  createAction,
  createFormRenderer,
  RenderForm,
  useAsyncRunner,
} from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { Form, SchemaFields } from "../../setup/testOptionTree";

const schemaLookup = createSchemaLookup({ SchemaFields });
const FormTree = createFormTree([Form]);
const renderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);
export default function FormDataTreePage() {
  const { ref, width, height } = useResizeObserver();
  const selected = useControl<FormStateNode | undefined>();
  const data = useControl({
    selectables: [
      { name: "WOW", id: "choice1" },
      { name: "WOW2", id: "COOL2" },
    ],
  });
  const jsonText = useControl(() =>
    JSON.stringify(data.current.value, null, 2),
  );
  useControlEffect(
    () => data.value,
    (v) => (jsonText.value = JSON.stringify(v, null, 2)),
  );
  const options = useControl<FormContextOptions>({});
  const { runAsync } = useAsyncRunner();
  const dataNode = createSchemaDataNode(
    schemaLookup.getSchema("SchemaFields"),
    data,
  );
  const rootControlState = useMemo(() => {
    return createFormStateNode(FormTree.rootNode, dataNode, {
      schemaInterface: defaultSchemaInterface,
      runAsync,
      contextOptions: options,
      evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
    });
  }, []);

  getWholeTree(rootControlState);
  return (
    <div className="flex flex-col h-full">
      <div className="h-64">
        <div className="flex h-full">
          <div className="overflow-auto basis-1/2">
            <JsonEditor control={jsonText} />
            {renderer.renderAction(
              createAction("Apply Json", () => {
                data.value = JSON.parse(jsonText.value);
              }),
            )}
          </div>
          <div className="overflow-auto h-full w-full p-4">
            <RenderFormNode node={rootControlState} renderer={renderer} />
          </div>
        </div>
      </div>
      <div className="flex grow">
        <div className="w-96 border" ref={ref}>
          <Tree<FormStateNode>
            width={width}
            height={height}
            onSelect={(n) => (selected.value = n[0]?.data)}
            data={[rootControlState]}
            idAccessor={(x) => x.uniqueId!}
            childrenAccessor={(x) => x.getChildNodes()}
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

function getWholeTree(node: FormStateNode) {
  return node.getChildNodes().forEach(getWholeTree);
}

function CurrentNode({ node }: { node: Control<FormStateNode> }) {
  const n = node.value;
  const {
    readonly,
    hidden,
    clearHidden,
    parent,
    dataNode,
    valid,
    resolved,
    variables,
  } = n;
  return (
    <pre>
      {JSON.stringify(
        {
          dataNode: dataNode?.control?.value,
          parent: parent.control.value,
          readonly,
          hidden,
          valid,
          clearHidden,
          variables,
        },
        null,
        2,
      )}
      <br />
      {resolved && resolvedData(resolved)}
    </pre>
  );

  function resolvedData(data: ResolvedDefinition) {
    const {
      definition: { children, ...definition },
      ...others
    } = data;

    return JSON.stringify({ ...others, definition }, null, 2);
  }
}
function FormNodeRenderer({
  style,
  dragHandle,
  node,
}: NodeRendererProps<FormStateNode>) {
  const def = node.data.resolved.definition;
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
      {def.type} {isDataControl(def) ? ` - ${def.field}` : ""}
    </div>
  );
}
