import {
  ControlDefinitionExtension,
  createDataRenderer,
  FieldType,
  getSchemaNodePath,
  isCompoundField,
  isCompoundNode,
  missingField,
  relativePath,
  RenderOptions,
  resolveSchemaNode,
  schemaForFieldRef,
  SchemaNode,
} from "@react-typed-forms/schemas";
import React, {
  Fragment,
  MouseEvent,
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
import { createOverlayState, Popover } from "@astroapps/aria-base";
import clsx from "clsx";
import { schemaNodeIcon } from "./util";
import { cn } from "@astroapps/client";
import { ViewContext } from "./views";
import { SchemaFieldEditor } from "./views/SchemaFieldEditor";
import { EditorSchemaTree } from "./EditorSchemaTree";

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
  viewContext: ViewContext;
}
export function createFieldSelectionRenderer({
  schema,
  viewContext,
}: FieldSelectionOptions) {
  return createDataRenderer(
    (props) => {
      return (
        <FieldSelection
          parentNode={schema}
          control={props.control as Control<string | undefined>}
          viewContext={viewContext}
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
  viewContext,
}: {
  parentNode: SchemaNode;
  control: Control<string | undefined>;
  viewContext: ViewContext;
}) {
  const editingNode = useControl<SchemaNode>();
  const open = useControl(false);
  const term = useControl("");
  const selNode = schemaForFieldRef(control.value, parentNode);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const selectorSchemaNode = useControl<SchemaNode>(parentNode);

  useControlEffect(
    () => open.value,
    (v) => {
      if (!v) {
        editingNode.value = undefined;
        return;
      }

      const parentSchema = getParentSchema(
        control.value?.split("/") ?? [],
        parentNode,
      );

      selectorSchemaNode.value = parentSchema;
    },
  );
  const canEdit = !!viewContext.saveSchema;

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
            {editingNode.value ? (
              <>
                <div>
                  {viewContext.button(
                    () => (editingNode.value = undefined),
                    "Finish",
                  )}
                </div>
                <SchemaFieldEditor
                  context={viewContext}
                  schema={editingNode.value}
                />
              </>
            ) : (
              <>
                <div>{viewContext.button(addChild, "New child")}</div>
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
                  parentNode={parentNode}
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

  function addChild() {
    const selected = selectorSchemaNode.value;
    const tree = selected.tree as EditorSchemaTree;
    const result = tree.addNode(selected, {
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
  selectorSchemaNode: Control<SchemaNode>;
  parentNode: SchemaNode;
  selectedField: Control<string | undefined>;
  searchTerm: Control<string>;
  onEdit?: (n: SchemaNode) => void;
  onDelete?: (n: SchemaNode) => void;
}) {
  const allNodes = makeChildNodes(parentNode, selectorSchemaNode.value);

  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  const onNodeClick = useCallback(
    (e: MouseEvent, n: SchemaNode) => {
      const onSingleClick = (
        e: MouseEvent,
        selectedSchema: SchemaNode,
      ): void => {
        selectedField.value = relativePath(parentNode, selectedSchema);
      };

      const onDoubleClick = (e: MouseEvent, n: SchemaNode): void => {
        const hasChildrenNodes = isCompoundNode(n) && !n.field.collection;

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
          key={n.id}
          nodeSchema={n}
          searchTerm={searchTerm}
          parentNode={parentNode}
          selection={selectedField.value}
          onClick={(e) => onNodeClick(e, n)}
          onEdit={
            onEdit
              ? (e) => {
                  e.stopPropagation();
                  onEdit(n);
                }
              : undefined
          }
          onDelete={
            onDelete
              ? (e) => {
                  e.stopPropagation();
                  onDelete(n);
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
  parentNode,
  onClick,
  onEdit,
  selection,
  searchTerm,
  onDelete,
}: {
  searchTerm: Control<string>;
  nodeSchema: SchemaNode;
  parentNode: SchemaNode;
  onClick: (e: MouseEvent) => void;
  onEdit?: (e: MouseEvent) => void;
  onDelete?: (e: MouseEvent) => void;
  selection?: string;
}) {
  const isSelected = selection === relativePath(parentNode, nodeSchema);
  const field = nodeSchema.field;
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
      <i
        className={clsx(
          "fa-solid w-4 h-4",
          schemaNodeIcon(nodeSchema.field.type),
        )}
      />
      <span>
        {nodeSchema.field.displayName} ({nodeSchema.field.field})
      </span>
      {onEdit && <button onClick={onEdit}>Edit</button>}
      {onDelete && <button onClick={onDelete}>Delete</button>}

      {hasChildrenNodes && (
        <i className={clsx("w-4 h-4 fa-solid fa-angle-right")} />
      )}
    </div>
  );
}

function makeChildNodes(parent: SchemaNode, n: SchemaNode): SchemaNode[] {
  let allNodes = n.getChildNodes();
  if (parent.id == n.id && parent.field.field.length > 0) {
    const selfNode = n.createChildNode({
      field: ".",
      displayName: "[" + parent.field.displayName + "]",
      type: parent.field.type,
    });
    allNodes = [selfNode, ...allNodes];
  }
  return allNodes;
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
      parentNode = schema.createChildNode(missingField(previousField));
    }
    schema = parentNode;
    i++;
  }
  return schema;
}
