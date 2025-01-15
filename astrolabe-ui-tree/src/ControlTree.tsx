import {
  Control,
  groupedChanges,
  removeElement,
  updateElements,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import React, { ReactElement } from "react";
import {
  closestCenter,
  defaultDropAnimation,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  MeasuringStrategy,
  Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AnimateLayoutChanges,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { setIncluded } from "@astroapps/client";
import update from "immutability-helper";
import { ControlTreeNode, ControlTreeProps, TreeDragState } from "./types";
import { DefaultTreeItem } from "./DefaultTreeItem";
import { toTreeNode } from "./treeNode";
import { findAllTreeParentsInArray, listToArray } from "./util";

export function ControlTree({
  controls,
  canDropAtRoot,
  indentationWidth = 50,
  indicator = true,
  treeState,
  actions,
  TreeItem = DefaultTreeItem,
  itemConfig = {},
  TreeContainer = ({ children, ...props }) => <>{children}</>,
}: ControlTreeProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  const dragState = useControl<TreeDragState>({ offsetLeft: 0 });
  const dragFields = dragState.fields;
  const { active } = dragFields;
  const treeFields = treeState.fields;

  const expanded = treeFields.expanded.value;

  const currentActive = active.value;
  const rootItems = controls.elements.map(
    toTreeNode(
      expanded,
      currentActive,
      {
        childIndex: 0,
        expanded: true,
        childrenNodes: [],
        render: () => {
          throw "";
        },
        children: controls,
        control: controls,
        canDropChild: canDropAtRoot,
        indent: -1,
        parent: undefined,
      },
      0,
    ),
  );
  const flatten: (x: ControlTreeNode) => ControlTreeNode[] = (x) => [
    x,
    ...x.childrenNodes.flatMap(flatten),
  ];
  const treeItems = rootItems.flatMap(flatten);
  const activeIndex = currentActive
    ? treeItems.findIndex((x) => x.control === currentActive)
    : -1;

  useControlEffect(
    () => treeFields.selected.value,
    (sel) => {
      if (sel) {
        const nodeIds = listToArray(
          findAllTreeParentsInArray(sel, controls),
        ).map((x) => x.uniqueId);
        const expanded = treeFields.expanded.current.value;
        const unExpandedNodes = nodeIds.filter((x) => !expanded.includes(x));
        if (unExpandedNodes.length)
          treeFields.expanded.setValue((x) => [...x, ...unExpandedNodes]);
      }
    },
    true,
  );

  useControlEffect(
    () => {
      const overId = dragFields.overId.value;
      const offsetLeft = dragFields.offsetLeft.value;

      if (activeIndex >= 0 && overId != null) {
        const overIndex = treeItems.findIndex(
          (x) => x.control.uniqueId === overId,
        );
        const indexAdjust = overIndex > activeIndex ? 0 : 1;
        const prevItem = treeItems[overIndex - indexAdjust];
        const draggedItem = treeItems[activeIndex];
        const mouseIndent = offsetLeft + draggedItem.indent;
        const overItem = treeItems[overIndex];

        let closestDrop: [number, ControlTreeNode, number] | undefined;

        const checkDrop = (childIndex: number, parent: ControlTreeNode) => {
          const diff = Math.abs((parent.indent ?? 0) + 1 - mouseIndent);
          if (!closestDrop || closestDrop[2] > diff) {
            closestDrop = [childIndex, parent, diff];
          }
        };

        const draggedControl = draggedItem.control;
        let overParent = overItem.parent;
        if (prevItem) {
          const prevParent = prevItem.parent;
          if (prevItem.canDropChild(draggedControl)) {
            checkDrop(0, prevItem);
          }
          if (
            prevParent &&
            prevParent.canDropChild(draggedControl) &&
            (nodeChildCount(prevItem) === 0 || !prevItem.expanded)
          ) {
            checkDrop(prevItem.childIndex + indexAdjust, prevParent);
          }
        } else {
          if (overParent && overParent.canDropChild(draggedControl)) {
            checkDrop(0, overParent);
          }
        }
        if (
          overParent &&
          nodeChildCount(overParent) === overItem.childIndex + 1
        ) {
          while (overParent) {
            if (overParent.parent?.canDropChild(draggedControl))
              checkDrop(overParent.childIndex + 1, overParent.parent);
            overParent = overParent.parent;
          }
        }
        return closestDrop
          ? {
              childIndex: closestDrop[0],
              parent: closestDrop[1],
              dragged: draggedItem,
            }
          : undefined;
      }
      return undefined;
    },
    (v) => (treeFields.dragInsert.value = v),
  );
  const activeFlat = activeIndex != null ? treeItems[activeIndex] : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragOver={handleDragOver}
      onDragMove={handleDragMove}
      measuring={measuring}
    >
      <SortableContext
        items={treeItems.map((x) => x.control.uniqueId)}
        strategy={verticalListSortingStrategy}
      >
        <TreeContainer
          displayedNodes={treeItems}
          selected={treeFields.selected}
          active={dragState.fields.active}
        >
          {rootItems.map((x) => renderTreeNode(x))}
        </TreeContainer>
      </SortableContext>
      <DragOverlay
        dropAnimation={dropAnimationConfig}
        modifiers={indicator ? [adjustTranslate] : undefined}
      >
        {activeFlat ? renderTreeNode(activeFlat, true) : null}
      </DragOverlay>
    </DndContext>
  );

  function onCollapse(x: ControlTreeNode) {
    treeFields.expanded.setValue((ex) =>
      setIncluded(ex, x.control.uniqueId, !x.expanded),
    );
  }

  function renderTreeNode(x: ControlTreeNode, clone?: boolean): ReactElement {
    const treeFields = treeState.fields;
    const hasChildren = nodeChildCount(x) > 0;
    return x.render({
      node: x,
      renderItem: (title, itemActions, canHaveChildren) => (
        <TreeItem
          key={x.control.uniqueId}
          node={x}
          clone={clone}
          selected={treeFields.selected}
          title={title ?? ""}
          indentationWidth={indentationWidth}
          indicator={indicator}
          displayedNodes={treeItems}
          insertState={treeFields.dragInsert}
          active={dragState.fields.active}
          onCollapse={hasChildren ? () => onCollapse(x) : undefined}
          canHaveChildren={canHaveChildren}
          itemConfig={itemConfig}
          actions={itemActions ?? actions?.(x)}
        />
      ),
      children: clone ? [] : x.childrenNodes.map((c) => renderTreeNode(c)),
    });
  }

  function handleStart(e: DragStartEvent) {
    dragState.value = {
      active: e.active.data.current?.control,
      offsetLeft: 0,
      overId: e.active.id as number,
    };
    document.body.style.setProperty("cursor", "grabbing");
  }

  function handleEnd(e: DragEndEvent) {
    const treeFields = treeState.fields;
    groupedChanges(() => {
      const insertedAt = treeFields.dragInsert.value;
      if (insertedAt) {
        const dragParentChildren = insertedAt.dragged.parent?.children;
        const destParentChildren = insertedAt.parent?.children;
        const draggedControl = insertedAt.dragged.control;
        if (dragParentChildren && destParentChildren) {
          const destIndex = insertedAt.childIndex;
          const currentIndex =
            dragParentChildren.elements?.indexOf(draggedControl) ?? -1;
          if (destParentChildren === dragParentChildren) {
            if (currentIndex !== destIndex) {
              updateElements(dragParentChildren, (childList) =>
                update(childList, {
                  $splice: [
                    [currentIndex, 1],
                    [destIndex, 0, draggedControl],
                  ],
                }),
              );
            }
          } else {
            updateElements(dragParentChildren, (childList) =>
              childList.filter((x) => x !== draggedControl),
            );
            updateElements(destParentChildren, (childList) =>
              update(childList, {
                $splice: [[destIndex, 0, draggedControl]],
              }),
            );
          }
        }
      }
      dragState.value = {
        offsetLeft: 0,
        overId: undefined,
        active: undefined,
      };
      treeFields.dragInsert.value = undefined;
    });
    document.body.style.setProperty("cursor", "");
  }
  function handleDragOver({ over }: DragOverEvent) {
    dragState.fields.overId.value = over?.id as number;
  }
  function handleDragMove({ delta }: DragMoveEvent) {
    dragState.fields.offsetLeft.value = Math.round(delta.x / indentationWidth);
  }
}
const adjustTranslate: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: transform.y - 25,
  };
};

const dropAnimationConfig: DropAnimation = {
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ];
  },
  easing: "ease-out",
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    });
  },
};

function nodeChildCount(f: ControlTreeNode | undefined) {
  const children = f?.children?.current.value;
  return children ? children.length : 0;
}

const measuring = {
  droppable: {
    // strategy: MeasuringStrategy.Always,
    strategy: MeasuringStrategy.WhileDragging,
    frequency: 1000,
  },
};

export function removeNodeFromParent(
  node: ControlTreeNode,
  selected: Control<Control<any> | undefined>,
) {
  groupedChanges(() => {
    const siblings = node.parent?.children;
    siblings && removeElement(siblings, node.control);
    if (selected.value === node.control) {
      selected.value = undefined;
    }
  });
}
