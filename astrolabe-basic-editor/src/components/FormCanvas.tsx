import React, { useCallback, useMemo, useState } from "react";
import { Control, useControl } from "@react-typed-forms/core";
import {
  createSchemaDataNode,
  defaultSchemaInterface,
  FormNode,
  FormRenderer,
} from "@react-typed-forms/schemas";
import {
  createPreviewNode,
  FormControlPreview,
  FormControlPreviewContext,
  FormPreviewStateNode,
} from "../FormControlPreview";
import { EditorFormTree } from "../EditorFormTree";
import { EditorSchemaTree } from "../EditorSchemaTree";
import {
  DndContext,
  closestCenter,
  pointerWithin,
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export interface FormCanvasProps {
  formTree: EditorFormTree;
  schemaTree: EditorSchemaTree;
  selectedField: Control<FormNode | undefined>;
  formRenderer: FormRenderer;
  selectField: (node: FormNode | undefined) => void;
  moveField: (
    sourceNode: FormNode,
    targetContainer: FormNode,
    insertBefore: FormNode | null,
  ) => void;
  pageMode?: boolean;
}

function findPreviewNode(
  root: FormPreviewStateNode,
  id: string,
): FormPreviewStateNode | undefined {
  if (root.id === id) return root;
  for (const child of root.getChildNodes() as FormPreviewStateNode[]) {
    const found = findPreviewNode(child, id);
    if (found) return found;
  }
  return undefined;
}

function findContainerNode(
  rootNode: FormNode,
  containerId: string,
): FormNode | undefined {
  if (containerId === rootNode.id) return rootNode;
  return rootNode.visit((x) =>
    x.id === containerId ? x : undefined,
  );
}

const dropZoneFirstCollision: CollisionDetection = (args) => {
  // Exclude the drop zone of the container that the active item belongs to,
  // so dragging OUT of a group isn't blocked by its own drop zone.
  const activeContainerId = args.active.data.current?.containerId;
  const dropZones = args.droppableContainers.filter(
    (c) =>
      c.data.current?.isContainerDropZone &&
      c.data.current?.containerId !== activeContainerId,
  );

  // Check if the pointer is within any group drop zone
  if (dropZones.length > 0) {
    const dropZoneCollisions = pointerWithin({
      ...args,
      droppableContainers: dropZones,
    });
    if (dropZoneCollisions.length > 0) {
      return dropZoneCollisions;
    }
  }

  // Fall back to closestCenter for normal sortable reordering
  return closestCenter(args);
};

export function FormCanvas({
  formTree,
  schemaTree,
  selectedField,
  formRenderer,
  selectField,
  moveField,
  pageMode,
}: FormCanvasProps) {
  const rootNode = formTree.rootNode;
  const schemaRootNode = schemaTree.rootNode;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropAfter, setDropAfter] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const previewContext: FormControlPreviewContext = useMemo(
    () => ({
      selected: selectedField,
      renderer: formRenderer,
      overId,
      activeId,
      dropAfter,
      pageMode,
    }),
    [formRenderer, selectedField, overId, activeId, dropAfter, pageMode],
  );

  const dataControl = useControl({});
  const dataNode = useMemo(
    () => createSchemaDataNode(schemaRootNode, dataControl),
    [schemaRootNode],
  );

  const previewNode = useMemo(
    () =>
      createPreviewNode(
        "root",
        defaultSchemaInterface,
        rootNode,
        dataNode,
        formRenderer,
      ),
    [rootNode, dataNode, formRenderer],
  );

  const rootChildIds = rootNode.getChildNodes().map((c) => c.id);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setOverId(null);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over ? (event.over.id as string) : null;
    setOverId(overId);
    if (event.over && event.active) {
      const activeRect = event.active.rect.current.initial;
      const overRect = event.over.rect;
      if (activeRect && overRect) {
        const activeCenter = activeRect.top + activeRect.height / 2;
        const overCenter = overRect.top + overRect.height / 2;
        setDropAfter(activeCenter < overCenter);
      }
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      setOverId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Resolve source FormNode
      const sourceFound = formTree.findNodeWithParent(active.id as string);
      if (!sourceFound) return;
      const sourceNode = sourceFound.node;

      const overData = over.data.current as
        | {
            containerId?: string;
            isContainerDropZone?: boolean;
            node?: FormPreviewStateNode;
          }
        | undefined;

      let targetContainer: FormNode | undefined;
      let insertBefore: FormNode | null = null;

      if (overData?.isContainerDropZone) {
        // Dropping on a group's drop zone — append to the end
        const targetContainerId = overData.containerId ?? rootNode.id;
        targetContainer = findContainerNode(rootNode, targetContainerId);
        insertBefore = null;
      } else {
        const targetContainerId = overData?.containerId ?? rootNode.id;
        targetContainer = findContainerNode(rootNode, targetContainerId);
        if (!targetContainer) return;

        const targetChildNodes = targetContainer.getChildNodes();
        const overNode = targetChildNodes.find(
          (c) => c.id === (over.id as string),
        );

        if (overNode) {
          const overIndex = targetChildNodes.indexOf(overNode);
          const activeRect = active.rect.current.initial;
          const overRect = over.rect;
          const isAfter =
            activeRect && overRect
              ? activeRect.top + activeRect.height / 2 <
                overRect.top + overRect.height / 2
              : false;

          if (isAfter) {
            insertBefore = targetChildNodes[overIndex + 1] ?? null;
          } else {
            insertBefore = overNode;
          }
        }
      }

      if (!targetContainer) return;
      moveField(sourceNode, targetContainer, insertBefore);
    },
    [formTree, rootNode, moveField],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  const activeNode = activeId
    ? findPreviewNode(previewNode, activeId)
    : undefined;

  return (
    <div
      className="flex-1 overflow-auto p-6 bg-slate-50"
      onClick={() => selectField(undefined)}
    >
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-[0_4px_20px_rgba(44,43,61,0.04),0_1px_4px_rgba(44,43,61,0.02)] border border-violet-100/60 p-6 min-h-[200px]">
        <DndContext
          sensors={sensors}
          collisionDetection={dropZoneFirstCollision}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={rootChildIds}
            strategy={verticalListSortingStrategy}
          >
            <FormControlPreview
              node={previewNode}
              context={previewContext}
              isRoot
            />
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeNode ? (
              <div
                style={{
                  background: "white",
                  borderRadius: 8,
                  boxShadow:
                    "0 4px 20px rgba(44,43,61,0.12), 0 1px 4px rgba(44,43,61,0.06)",
                  padding: "4px 8px",
                  opacity: 0.9,
                  pointerEvents: "none",
                }}
              >
                <FormControlPreview
                  node={activeNode}
                  context={previewContext}
                  isRoot
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
