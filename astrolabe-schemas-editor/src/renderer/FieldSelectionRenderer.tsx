import {
  ControlDefinitionExtension,
  createAction,
  createDataRenderer,
  DataPathNode,
  FieldType,
  FormRenderer,
  getParentDataPath,
  isCompoundField,
  isCompoundNode,
  missingField,
  relativeSegmentPath,
  RenderOptions,
  resolveSchemaNode,
  schemaForDataPath,
  SchemaNode,
} from "@react-typed-forms/schemas";
import React, {
  Fragment,
  MouseEvent,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  Control,
  groupedChanges,
  RenderOptional,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import clsx from "clsx";
import { schemaNodeIcon } from "../util";
import { cn } from "@astroapps/client";
import { EditorSchemaTree } from "../EditorSchemaTree";
import { Popover } from "react-aria-components";

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
  edit?: (node: SchemaNode) => ReactNode;
}
export function createFieldSelectionRenderer({
  schema,
  edit,
}: FieldSelectionOptions) {
  return createDataRenderer(
    (props, formRenderer) => {
      return (
        <FieldSelection
          parentNode={schema}
          control={props.control as Control<string | undefined>}
          edit={edit}
          formRenderer={formRenderer}
        />
      );
    },
    {
      renderType: RenderType,
    },
  );
}

export function FieldSelection({
  parentNode,
  control,
  edit,
  formRenderer,
}: {
  parentNode: SchemaNode;
  control: Control<string | undefined>;
  edit?: (n: SchemaNode) => ReactNode;
  formRenderer: FormRenderer;
}) {
  const parentDataNode = {
    node: parentNode,
    element: !!parentNode.field.collection,
  };
  const editingNode = useControl<SchemaNode>();
  const open = useControl(false);
  const term = useControl("");
  const path = control.value?.split("/") ?? [];
  const selNode = schemaForDataPath(path, parentNode);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const selectorSchemaNode = useControl<DataPathNode>(parentDataNode);
  const canEdit = !!edit;
  useControlEffect(
    () => open.value,
    (v) => {
      if (!v) {
        editingNode.value = undefined;
        return;
      }
      selectorSchemaNode.value = parentDataNode;
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
              {selNode.node.field.displayName} ({c.value})
            </span>
          )}
        </RenderOptional>
      </div>
      {open.value && (
        <Popover
          isOpen
          onOpenChange={(x) => (open.value = x)}
          triggerRef={triggerRef}
          placement="top left"
          className="bg-white"
        >
          <div
            className={
              "flex flex-col gap-2 min-w-[500px] border border-black p-2"
            }
          >
            {edit && editingNode.value ? (
              <>
                <div>
                  {button(() => (editingNode.value = undefined), "Finish")}
                </div>
                {edit(editingNode.value)}
              </>
            ) : (
              <>
                {canEdit && <div>{button(addChild, "New field")}</div>}
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
                  parentNode={parentDataNode}
                  selectedField={control}
                  searchTerm={term}
                  onEdit={canEdit ? (n) => (editingNode.value = n) : undefined}
                  onDelete={
                    canEdit
                      ? (n) => {
                          (n.tree as EditorSchemaTree).deleteNode(n);
                        }
                      : undefined
                  }
                />
              </>
            )}
          </div>
        </Popover>
      )}
    </>
  );

  function button(onClick: () => void, actionText: string) {
    return formRenderer.renderAction(
      createAction(actionText, onClick, actionText),
    );
  }
  function addChild() {
    const selected = selectorSchemaNode.value;
    const tree = selected.node.tree as EditorSchemaTree;
    const result = tree.addNode(selected.node, {
      field: "",
      type: FieldType.String,
    });
    groupedChanges(() => {
      editingNode.value = result;
    });
  }
}

function SchemaNodeList({
  selectorSchemaNode,
  parentNode,
  selectedField,
  searchTerm,
  onEdit,
  onDelete,
}: {
  selectorSchemaNode: Control<DataPathNode>;
  parentNode: DataPathNode;
  selectedField: Control<string | undefined>;
  searchTerm: Control<string>;
  onEdit?: (n: SchemaNode) => void;
  onDelete?: (n: SchemaNode) => void;
}) {
  const allNodes = makeChildNodes(selectorSchemaNode.value);

  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  const onNodeClick = useCallback(
    (e: MouseEvent, n: DataPathNode) => {
      const onSingleClick = (
        e: MouseEvent,
        selectedSchema: DataPathNode,
      ): void => {
        selectedField.value = relativeDataPath(parentNode, selectedSchema);
      };

      const onDoubleClick = (e: MouseEvent, n: DataPathNode): void => {
        const hasChildrenNodes =
          isCompoundNode(n.node) && !n.node.field.collection;

        if (!hasChildrenNodes) return;
        selectorSchemaNode.value = n;
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
      {allNodes.map((n) => (
        <SchemaNodeRenderer
          key={n.node.id}
          nodeSchema={n}
          searchTerm={searchTerm}
          selection={selectedField.value}
          onClick={(e) => onNodeClick(e, n)}
          onEdit={
            onEdit
              ? (e) => {
                  e.stopPropagation();
                  onEdit(n.node);
                }
              : undefined
          }
          onDelete={
            onDelete
              ? (e) => {
                  e.stopPropagation();
                  onDelete(n.node);
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

function SchemaNodeRenderer({
  nodeSchema,
  onClick,
  onEdit,
  selection,
  searchTerm,
  onDelete,
}: {
  searchTerm: Control<string>;
  nodeSchema: DataPathNode;
  onClick: (e: MouseEvent) => void;
  onEdit?: (e: MouseEvent) => void;
  onDelete?: (e: MouseEvent) => void;
  selection?: string;
}) {
  const isSelected = false; // selection === relativePath(parentNode, nodeSchema);
  const field = nodeSchema.node.field;
  const hasChildrenNodes =
    field.field != "." && isCompoundField(field) && !field.collection;
  const show =
    field.displayName?.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    field.field.toLowerCase().includes(searchTerm.value.toLowerCase());
  if (!show) return null;
  return (
    <div
      className={clsx(
        "flex flex-row gap-2 items-center rounded hover:bg-primary-100 hover:cursor-pointer text-nowrap px-4 select-none",
        isSelected && "bg-primary-200 hover:bg-primary-200",
      )}
      onClick={onClick}
    >
      <i className={clsx("fa-solid w-4 h-4", schemaNodeIcon(field.type))} />
      <span>
        {field.displayName} ({field.field})
      </span>
      {onEdit && <button onClick={onEdit}>Edit</button>}
      {onDelete && <button onClick={onDelete}>Delete</button>}

      {hasChildrenNodes && (
        <i className={clsx("w-4 h-4 fa-solid fa-angle-right")} />
      )}
    </div>
  );
}

function makeChildNodes(n: DataPathNode): DataPathNode[] {
  if (!n.element && n.node.field.collection)
    return [{ node: n.node, element: true }];
  return n.node
    .getChildNodes()
    .map((child) => ({ node: child, element: false }));
}

function SchemaHierarchyBreadcrumb({
  selectorSchemaNode,
}: {
  selectorSchemaNode: Control<DataPathNode>;
}) {
  const schemaHierarchy = getSchemaDataPath(selectorSchemaNode.value);

  function onBreadcrumbClick(upLevels: number) {
    groupedChanges(() => {
      let current: DataPathNode | undefined = selectorSchemaNode.value;
      for (let i = 0; i < upLevels && current; i++) {
        current = getParentDataPath(current);
      }
      if (current) selectorSchemaNode.value = current;
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

export function getSchemaDataPath(node: DataPathNode) {
  const paths: string[] = [];
  let curNode: DataPathNode | undefined = node;
  while (curNode) {
    const field = curNode.node.field;
    paths.push(
      field.field + (field.collection && !curNode.element ? "[]" : ""),
    );
    curNode = getParentDataPath(curNode);
  }
  return paths.reverse();
}

function relativeDataPath(node: DataPathNode, node2: DataPathNode) {
  const rel = relativeSegmentPath(dataPath(node), dataPath(node2));
  return rel ? rel : ".";

  function dataPath(node: DataPathNode) {
    const paths: string[] = [];
    let curNode: DataPathNode | undefined = node;
    while (curNode) {
      const field = curNode.node.field;
      if (curNode.element) {
        paths.push(".");
      } else paths.push(field.field);
      curNode = getParentDataPath(curNode);
    }
    return paths.reverse();
  }
}
