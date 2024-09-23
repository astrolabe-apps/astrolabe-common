"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { ReactNode } from "react";
import { PopoverContentProps } from "@radix-ui/react-popover";

export interface PopoverProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  side?: PopoverContentProps["side"];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerClass?: string;
  asChild?: boolean;
}

export function Popover({
  children,
  content,
  className,
  open,
  onOpenChange,
  triggerClass,
  asChild,
  // ref,
  ...props
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.PopoverTrigger
        className={triggerClass}
        asChild={asChild}
      >
        {children}
      </PopoverPrimitive.PopoverTrigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          {...props}
          className={className}
          children={content}
        />
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
