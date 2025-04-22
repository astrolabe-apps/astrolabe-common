import { Popover as AriaPopover, PopoverProps } from "react-aria-components";

export function Popover(props: PopoverProps) {
  return (
    <AriaPopover
      {...props}
      className="p-2 overflow-auto outline-hidden rounded-lg bg-white dark:bg-zinc-950 shadow-lg ring-1 ring-black/10 dark:ring-white/15 entering:animate-in entering:fade-in entering:placement-bottom:slide-in-from-top-1 entering:placement-top:slide-in-from-bottom-1 exiting:animate-out exiting:fade-out exiting:placement-bottom:slide-out-to-top-1 exiting:placement-top:slide-out-to-bottom-1 fill-mode-forwards origin-top-left"
    />
  );
}
