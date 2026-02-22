import React, { useCallback, useMemo, useState } from "react";
import { Control, useControl } from "@react-typed-forms/core";
import {
  createSchemaDataNode,
  defaultSchemaInterface,
  FormNode,
  isGroupControl,
  RenderForm,
} from "@react-typed-forms/schemas";
import {
  createPreviewNode,
  FormControlPreview,
  FormControlPreviewContext,
  FormPreviewStateNode,
} from "../FormControlPreview";
import { useBasicEditorContext } from "../BasicEditorContext";
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

export function FormCanvas() {
  const { state } = useBasicEditorContext();
  const previewMode = state.fields.previewMode.value;
  if (previewMode) {
    return <PreviewModeCanvas />;
  }
  return <EditModeCanvas />;
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

function findContainerChildren(
  formTree: { rootNode: FormNode },
  containerId: string,
): string[] {
  const container =
    containerId === formTree.rootNode.id
      ? formTree.rootNode
      : formTree.rootNode.visit((x) =>
          x.id === containerId ? x : undefined,
        );
  if (!container) return [];
  return container.getChildNodes().map((c) => c.id);
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

function EditModeCanvas() {
  const { state, formRenderer, selectField, moveField } =
    useBasicEditorContext();
  const formTree = state.fields.formTree.value;
  const schemaTree = state.fields.schemaTree.value;
  const selectedControl = state.fields.selectedFieldId as unknown as Control<
    string | undefined
  >;

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
      selected: selectedControl,
      renderer: formRenderer,
      overId,
      activeId,
      dropAfter,
    }),
    [formRenderer, selectedControl, overId, activeId, dropAfter],
  );

  const rootNode = formTree?.rootNode;
  const schemaRootNode = schemaTree?.rootNode;
  if (!rootNode || !schemaRootNode) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

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

  const rootChildIds = rootNode
    .getChildNodes()
    .map((c) => c.id);

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

      const activeData = active.data.current as
        | { containerId?: string; node?: FormPreviewStateNode }
        | undefined;
      const overData = over.data.current as
        | { containerId?: string; isContainerDropZone?: boolean; node?: FormPreviewStateNode }
        | undefined;

      const sourceContainerId = activeData?.containerId ?? rootNode.id;

      let targetContainerId: string;
      let targetIndex: number;

      if (overData?.isContainerDropZone) {
        // Dropping on a group's drop zone — append to the end of the container
        targetContainerId = overData.containerId ?? rootNode.id;
        const containerChildren = findContainerChildren(
          formTree,
          targetContainerId,
        );
        targetIndex = containerChildren.length;
      } else {
        targetContainerId = overData?.containerId ?? rootNode.id;

        const containerChildren = findContainerChildren(
          formTree,
          targetContainerId,
        );
        const overIndex = containerChildren.indexOf(over.id as string);
        targetIndex = overIndex >= 0 ? overIndex : containerChildren.length;

        // Determine drop position based on visual indicator
        const activeRect = active.rect.current.initial;
        const overRect = over.rect;
        const isAfter =
          activeRect && overRect
            ? activeRect.top + activeRect.height / 2 <
              overRect.top + overRect.height / 2
            : false;

        if (isAfter) {
          targetIndex += 1;
        }
      }

      moveField(active.id as string, targetContainerId, targetIndex);
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

function PreviewModeCanvas() {
  const { state, formRenderer } = useBasicEditorContext();
  const formTree = state.fields.formTree.value;
  const schemaTree = state.fields.schemaTree.value;
  const previewData = useControl({});

  const rootNode = formTree?.rootNode;
  const schemaRootNode = schemaTree?.rootNode;
  if (!rootNode || !schemaRootNode) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  const dataNode = useMemo(
    () => createSchemaDataNode(schemaRootNode, previewData),
    [schemaRootNode],
  );

  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-[0_4px_20px_rgba(44,43,61,0.04),0_1px_4px_rgba(44,43,61,0.02)] border border-violet-100/60 p-6 min-h-[200px]">
        <RenderForm
          data={dataNode}
          form={rootNode}
          renderer={formRenderer}
        />
      </div>
    </div>
  );
}
