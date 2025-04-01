import {
  ControlDefinitionExtension,
  createDataRenderer,
  createSchemaNode,
  getSchemaNodePath,
  isCompoundNode,
  missingField,
  relativePath,
  RenderOptions,
  resolveSchemaNode,
  schemaForFieldRef,
  SchemaNode,
} from "@react-typed-forms/schemas";
import React, {
  useRef,
  useState,
  MouseEvent,
  useCallback,
  Fragment,
} from "react";
import {
  Control,
  groupedChanges,
  RenderOptional,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { createOverlayState, Popover } from "@astroapps/aria-base";
import clsx from "clsx";
import { schemaNodeIcon } from "./util";
import { EditorSchemaNode } from "./EditorSchemaNode";
import { cn } from "@astroapps/client";

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

  const selectorSchemaNode = useControl<SchemaNode>(schema);

  useControlEffect(
    () => open.value,
    (v) => {
      if (!v) return;

      const parentSchema = getParentSchema(
        control.value?.split("/") ?? [],
        schema,
      );

      selectorSchemaNode.value = parentSchema;
    },
  );

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
            <SchemaHierarchyBreadcrumb
              selectorSchemaNode={selectorSchemaNode}
            />
            <SchemaNodeList
              selectorSchemaNode={selectorSchemaNode}
              schemaNode={schema}
              selectedField={control}
              searchTerm={term}
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

function SchemaNodeList({
  selectorSchemaNode,
  schemaNode,
  selectedField,
  searchTerm,
}: {
  selectorSchemaNode: Control<SchemaNode>;
  schemaNode: SchemaNode;
  selectedField: Control<string | undefined>;
  searchTerm: Control<string>;
}) {
  const allNodes = makeChildNodes(selectorSchemaNode.value);

  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  const onNodeClick = useCallback(
    (e: MouseEvent, n: NodeCtx) => {
      const onSingleClick = (e: MouseEvent, n: NodeCtx): void => {
        const selectedSchema = n.schema;
        selectedField.value = relativePath(schemaNode, selectedSchema);
      };

      const onDoubleClick = (e: MouseEvent, n: NodeCtx): void => {
        const hasChildrenNodes =
          isCompoundNode(n.schema) && !n.schema.field.collection;

        if (!hasChildrenNodes) return;

        selectorSchemaNode.value = n.schema as EditorSchemaNode;
      };

      if (clickTimeout) {
        clearTimeout(clickTimeout);
        setClickTimeout(null);
        onDoubleClick(e, n);
      } else {
        const timeout = setTimeout(() => {
          onSingleClick(e, n);
          setClickTimeout(null);
        }, 250);
        setClickTimeout(timeout);
      }
    },
    [clickTimeout],
  );

  return (
    <div className={"flex flex-col gap-1"}>
      {allNodes.map((n) => {
        const show =
          n.schema.field.displayName
            ?.toLowerCase()
            .includes(searchTerm.value.toLowerCase()) ||
          n.schema.field.field
            .toLowerCase()
            .includes(searchTerm.value.toLowerCase());

        return (
          show && (
            <SchemaNodeRenderer
              key={n.id}
              nodeSchema={n.schema}
              schemaNode={schemaNode}
              selection={selectedField.value}
              onClick={(e) => onNodeClick(e, n)}
            />
          )
        );
      })}
    </div>
  );
}

function SchemaNodeRenderer({
  nodeSchema,
  schemaNode,
  onClick,
  selection,
}: {
  nodeSchema: SchemaNode;
  schemaNode: SchemaNode;
  onClick: (e: MouseEvent) => void;
  selection?: string;
}) {
  const isSelected = selection === relativePath(schemaNode, nodeSchema);
  const hasChildrenNodes =
    isCompoundNode(nodeSchema) && !nodeSchema.field.collection;

  return (
    <div
      className={clsx(
        "flex flex-row gap-2 items-center rounded hover:bg-primary-100 hover:cursor-pointer text-nowrap px-4 select-none",
        isSelected && "bg-primary-200 hover:bg-primary-200",
      )}
      onClick={onClick}
    >
      <i
        className={clsx(
          "fa-solid w-4 h-4",
          schemaNodeIcon(nodeSchema.field.type),
        )}
      />
      <span>
        {nodeSchema.field.displayName} ({nodeSchema.field.field})
      </span>
      {hasChildrenNodes && (
        <i className={clsx("w-4 h-4 fa-solid fa-angle-right")} />
      )}
    </div>
  );
}

function makeChildNodes(n: SchemaNode): NodeCtx[] {
  function getNodeId(node: SchemaNode): string {
    return getSchemaNodePath(node).join("/");
  }

  return n.getChildNodes().map((x) => ({
    schema: x,
    id: getNodeId(x),
  }));
}

function SchemaHierarchyBreadcrumb({
  selectorSchemaNode,
}: {
  selectorSchemaNode: Control<SchemaNode>;
}) {
  const schemaHierarchy = getSchemaNodePath(selectorSchemaNode.value);

  function onBreadcrumbClick(upLevels: number) {
    groupedChanges(() => {
      for (let i = 0; i < upLevels; i++) {
        const parent = selectorSchemaNode.fields.parent.value;
        if (parent) {
          selectorSchemaNode.value = parent;
        }
      }
    });
  }

  return (
    <div className={"flex flex-row gap-2 flex-wrap px-2 py-1"}>
      {schemaHierarchy.map((x, i, xs) => {
        const isCurrentNode = i == xs.length - 1;
        return (
          <Fragment key={x}>
            <Breadcrumb
              field={x}
              onClick={() => onBreadcrumbClick(xs.length - 1 - i)}
              className={cn(
                isCurrentNode
                  ? "text-primary-500 underline font-bold"
                  : "cursor-pointer hover:underline",
              )}
            />
            {!isCurrentNode && <div>/</div>}
          </Fragment>
        );
      })}
    </div>
  );
}

function Breadcrumb({
  field,
  onClick,
  className,
}: {
  field: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <span onClick={onClick} className={className}>
      {field == "" ? "_" : field}
    </span>
  );
}

function getParentSchema(fieldPath: string[], schema: SchemaNode) {
  let i = 0;
  while (i < fieldPath.length - 1) {
    const previousField = fieldPath[i];
    let parentNode = resolveSchemaNode(schema, previousField);
    if (!parentNode) {
      parentNode = createSchemaNode(
        missingField(previousField),
        schema,
        schema,
      );
    }
    schema = parentNode;
    i++;
  }
  return schema;
}
