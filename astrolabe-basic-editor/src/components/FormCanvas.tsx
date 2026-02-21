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
  DragEndEvent,
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

function EditModeCanvas() {
  const { state, formRenderer, selectField, moveField } =
    useBasicEditorContext();
  const formTree = state.fields.formTree.value;
  const schemaTree = state.fields.schemaTree.value;
  const selectedControl = state.fields.selectedFieldId as unknown as Control<
    string | undefined
  >;

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const previewContext: FormControlPreviewContext = useMemo(
    () => ({
      selected: selectedControl,
      renderer: formRenderer,
    }),
    [formRenderer, selectedControl],
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
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
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
        // Check if the over item is a group and the active item isn't already inside it
        const overNode = overData?.node;
        const overIsGroup = overNode && isGroupControl(overNode.definition);

        if (overIsGroup && sourceContainerId !== (over.id as string)) {
          // Dropping onto a non-empty group from outside — insert into the group
          targetContainerId = over.id as string;
          const containerChildren = findContainerChildren(
            formTree,
            targetContainerId,
          );
          targetIndex = containerChildren.length;
        } else {
          targetContainerId = overData?.containerId ?? rootNode.id;

          // Find the index of the over item in its container
          const containerChildren = findContainerChildren(
            formTree,
            targetContainerId,
          );
          const overIndex = containerChildren.indexOf(over.id as string);
          targetIndex = overIndex >= 0 ? overIndex : containerChildren.length;

          if (sourceContainerId === targetContainerId) {
            // Same container: find active index and determine direction
            const activeIndex = containerChildren.indexOf(active.id as string);
            if (activeIndex >= 0 && activeIndex < targetIndex) {
              targetIndex += 1;
            }
          } else {
            // Cross-container: insert after the over item
            targetIndex += 1;
          }
        }
      }

      moveField(active.id as string, targetContainerId, targetIndex);
    },
    [formTree, rootNode, moveField],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
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
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
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
