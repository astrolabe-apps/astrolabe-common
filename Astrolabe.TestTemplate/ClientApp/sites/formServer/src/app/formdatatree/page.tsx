"use client";
import {
  ControlDefinition,
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
import { FormControlPreview, JsonEditor } from "@astroapps/schemas-editor";
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
  RenderFormNode,
  useAsyncRunner,
} from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
// import { Form, SchemaFields } from "../../setup/basicForm";
import { createPreviewNode } from "@astroapps/schemas-editor";
import CarJson from "../../forms/CarSearch.json";
import { SchemaMap } from "../../schemas";
import { createDataGridRenderer } from "@astroapps/schemas-datagrid";
const SchemaFields = SchemaMap.CarSearchPage;
const Form = CarJson.controls as ControlDefinition[];

const schemaLookup = createSchemaLookup({ SchemaFields });
const FormTree = createFormTree(Form);
const renderer = createFormRenderer(
  [createDataGridRenderer()],
  createDefaultRenderers(defaultTailwindTheme),
);
export default function FormDataTreePage() {
  const { ref, width, height } = useResizeObserver();
  const selected = useControl<FormStateNode | undefined>();
  const editorView = useControl(false);
  const data = useControl({});
  const jsonText = useControl(() =>
    JSON.stringify(data.current.value, null, 2),
  );
  useControlEffect(
    () => data.value,
    (v) => (jsonText.value = JSON.stringify(v, null, 2)),
  );
  const options = useControl<FormContextOptions>({});
  const { runAsync } = useAsyncRunner();
  const schemaTree = schemaLookup.getSchemaTree("SchemaFields");

  const dataNode = createSchemaDataNode(schemaTree.rootNode, data);

  const rootPreviewNode = useMemo(() => {
    return createPreviewNode(
      "ROOT",
      defaultSchemaInterface,
      FormTree.rootNode,
      dataNode,
      renderer,
    );
  }, [renderer]);

  const rootEditNode = useMemo(() => {
    return createFormStateNode(FormTree.rootNode, dataNode, {
      schemaInterface: defaultSchemaInterface,
      runAsync,
      contextOptions: options,
      evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
      resolveChildren: renderer.resolveChildren,
    });
  }, [renderer]);

  const hideFields = useControl(false);
  const selectedControlId = useControl<string | undefined>();
  // const rootControlState = useMemo(() => {
  // }, []);
  const rootNode = editorView.value ? rootPreviewNode : rootEditNode;

  getWholeTree(rootNode);
  return (
    <div className="flex flex-col h-full">
      <div className="h-[50%]">
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
            {editorView.value ? (
              <FormControlPreview
                node={rootPreviewNode}
                context={{
                  selected: selectedControlId,
                  VisibilityIcon: <i className="fa fa-eye" />,
                  renderer,
                  hideFields,
                }}
              />
            ) : (
              <RenderFormNode node={rootEditNode} renderer={renderer} />
            )}
          </div>
        </div>
      </div>
      <div className="flex grow">
        <div className="w-96 border" ref={ref}>
          <Tree<FormStateNode>
            width={width}
            height={height}
            onSelect={(n) => (selected.value = n[0]?.data)}
            data={[rootNode]}
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
