import { ReactNode, useEffect, useRef, useState } from "react";
import { Popover, PopoverProps } from "./Popover";
import { cn } from "@astroapps/client";

export function HelpText({
  children,
  iconClass,
  className = "max-w-2xl",
  ...spread
}: Partial<PopoverProps> & {
  children: ReactNode;
  iconClass?: string;
  className?: string;
}) {
  const [open, setOpen] = useState({ open: false, hoverOpen: false });
  const openTimerRef = useRef(0);
  const closeTimerRef = useRef(0);
  const contentRef = useRef(false);
  useEffect(() => {
    return clearTimeout;
  }, []);
  const { content, ...props } = spread;
  return (
    <Popover
      content={
        <div onMouseEnter={() => (contentRef.current = true)}>{children}</div>
      }
      side="top"
      open={open.open}
      onOpenChange={(o) => {
        setOpen((x) => (x.open != o ? { open: o, hoverOpen: x.hoverOpen } : x));
        clearTimeout();
      }}
      className={className}
      {...props}
    >
      <i
        className={cn(
          "text-primary-500 fa-light fa-question-circle cursor-help print:hidden",
          iconClass,
        )}
        onMouseEnter={triggerEnter}
        onMouseLeave={triggerLeave}
      />
    </Popover>
  );

  function clearTimeout() {
    window.clearTimeout(openTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
  }

  function triggerEnter() {
    clearTimeout();
    openTimerRef.current = window.setTimeout(() => {
      contentRef.current = false;
      setOpen((c) => (!c.open ? { open: true, hoverOpen: true } : c));
    }, 1000);
  }

  function triggerLeave() {
    clearTimeout();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen((x) =>
        x.hoverOpen ? { open: contentRef.current, hoverOpen: false } : x,
      );
    }, 200);
  }
}
