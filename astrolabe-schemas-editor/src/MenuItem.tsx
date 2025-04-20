import {
  composeRenderProps,
  MenuItem as AriaMenuItem,
  MenuItemProps,
} from "react-aria-components";
import { tv } from "tailwind-variants";
import React from "react";

export const dropdownItemStyles = tv({
  base: "group flex items-center gap-4 cursor-default select-none py-2 pl-3 pr-1 rounded-lg outline outline-0 text-sm forced-color-adjust-none",
  variants: {
    isDisabled: {
      false: "text-gray-900 dark:text-zinc-100",
      true: "text-gray-300 dark:text-zinc-600 forced-colors:text-[GrayText]",
    },
    isFocused: {
      true: "bg-blue-600 text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
  },
  compoundVariants: [
    {
      isFocused: false,
      isOpen: true,
      className: "bg-gray-100 dark:bg-zinc-700/60",
    },
  ],
});

export function MenuItem(props: MenuItemProps) {
  let textValue =
    props.textValue ||
    (typeof props.children === "string" ? props.children : undefined);
  return (
    <AriaMenuItem
      textValue={textValue}
      {...props}
      className={dropdownItemStyles}
    >
      {composeRenderProps(props.children, (children) => (
        <>
          <span className="flex items-center flex-1 gap-2 font-normal truncate group-selected:font-semibold">
            {children}
          </span>
        </>
      ))}
    </AriaMenuItem>
  );
}
