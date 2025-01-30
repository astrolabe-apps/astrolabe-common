import clsx from "clsx";

import { ControlTreeItemProps, SortableTreeItem } from "./types";
import { AnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSSProperties } from "react";
import { CSS } from "@dnd-kit/utilities";

export function DefaultSortableTreeItem({
  clone,
  isDragging,
  setDraggableNodeRef,
  setDroppableNodeRef,
  paddingLeft,
  isSelected,
  itemProps,
  handleProps,
  canHaveChildren,
  onCollapse,
  expanded,
  title,
  actions,
  handleIcon,
}: SortableTreeItem) {
  return (
    <div
      className={clsx(
        clone && "inline-block",
        isDragging && "opacity-50",
        "cursor-pointer",
      )}
      ref={setDroppableNodeRef}
      style={{ paddingLeft }}
    >
      <div
        className={clsx(
          "flex gap-2 relative border items-center",
          isSelected && "bg-surface-200",
        )}
        {...itemProps}
        ref={setDraggableNodeRef}
      >
        <div {...handleProps}>
          {handleIcon || <i className="fa fa-grip-vertical cursor-grabbing" />}
        </div>
        {canHaveChildren && (
          <div
            onClick={() => onCollapse?.()}
            className={clsx("transition-transform", expanded && "rotate-90")}
          >
            <i className="fa fa-chevron-right" />
          </div>
        )}
        <div className="grow-1 truncate">{title}</div>
        {actions}
      </div>
    </div>
  );
}

export function useSortableTreeItem({
  node,
  active,
  insertState,
  clone,
  selected,
  indentationWidth,
  actions,
  onCollapse,
  canHaveChildren,
  title,
  itemConfig,
}: ControlTreeItemProps): SortableTreeItem {
  const {
    transform,
    transition,
    attributes,
    listeners,
    isDragging,
    setDraggableNodeRef,
    setDroppableNodeRef,
  } = useSortable({
    id: node.control.uniqueId,
    data: { control: node.control },
    animateLayoutChanges,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const insertParent = insertState.fields.parent.value;
  const depth =
    active.value === node.control && insertParent
      ? insertParent.indent + 1
      : node.indent;

  return {
    handleProps: { ...attributes, ...listeners },
    itemProps: { style, onClick: () => (selected.value = node.control) },
    isSelected: selected.value === node.control,
    canHaveChildren: canHaveChildren ?? !!node.children,
    setDraggableNodeRef,
    setDroppableNodeRef,
    isDragging,
    actions,
    title,
    clone,
    expanded: node.expanded,
    onCollapse,
    paddingLeft: clone ? 0 : depth * indentationWidth,
    ...itemConfig,
  };
}

const animateLayoutChanges: AnimateLayoutChanges = ({
  isSorting,
  wasDragging,
}) => !(isSorting || wasDragging);
