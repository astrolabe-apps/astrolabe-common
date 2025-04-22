import { NodeRendererProps } from "react-arborist";
import clsx from "clsx";
import React, { ReactNode } from "react";

export function StdTreeNode({
  style,
  children,
  dragHandle,
  node,
}: NodeRendererProps<any> & {
  children: ReactNode;
}) {
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
      {children}
    </div>
  );
}
