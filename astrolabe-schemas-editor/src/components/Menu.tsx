import React from "react";
import { Menu as AriaMenu, MenuProps } from "react-aria-components";
export function Menu<T extends object = object>(props: MenuProps<T>) {
  return (
    <AriaMenu<T>
      className="p-1 outline outline-0 max-h-[inherit] overflow-auto [clip-path:inset(0_0_0_0_round_.75rem)]"
      {...props}
    />
  );
}
