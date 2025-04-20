import { NodeRendererProps } from "react-arborist";
import clsx from "clsx";
import React, { ReactNode } from "react";
import { useControl } from "@react-typed-forms/core";
import { MenuProps, Popover } from "react-aria-components";

export function StdTreeNode({
  style,
  children,
  dragHandle,
  node,
  menu,
}: NodeRendererProps<any> & {
  children: ReactNode;
  menu?: (onClose: () => void) => ReactNode;
}) {
  const menuTrigger = React.useRef<HTMLDivElement | null>(null);
  const menuOpen = useControl(false);
  return (
    <div
      style={style}
      ref={(e) => {
        dragHandle?.(e);
        menuTrigger.current = e;
      }}
      className={clsx(
        "flex cursor-pointer items-center",
        node.isSelected && "bg-primary-100",
      )}
      onClick={() => node.isInternal && node.open()}
      onContextMenu={
        menu
          ? (e) => {
              e.preventDefault();
              menuOpen.value = true;
            }
          : undefined
      }
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
      {menu && menuOpen.value && (
        <Popover
          aria-label="context menu"
          className="p-2 overflow-auto outline-hidden rounded-lg bg-white dark:bg-zinc-950 shadow-lg ring-1 ring-black/10 dark:ring-white/15 entering:animate-in entering:fade-in entering:placement-bottom:slide-in-from-top-1 entering:placement-top:slide-in-from-bottom-1 exiting:animate-out exiting:fade-out exiting:placement-bottom:slide-out-to-top-1 exiting:placement-top:slide-out-to-bottom-1 fill-mode-forwards origin-top-left"
          isOpen
          onOpenChange={(x) => (menuOpen.value = x)}
          triggerRef={menuTrigger}
          children={menu(() => (menuOpen.value = false))}
          placement="bottom left"
        />
      )}
    </div>
  );
}
