"use client";

import * as React from "react";
import { ReactElement } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { makeProvider } from "@astroapps/client";
import { cva, VariantProps } from "class-variance-authority";

const tooltipVariants = cva(
  "z-[9999999] overflow-hidden rounded-md border min-w-[4rem] px-3 py-1.5 text-sm shadow-md animate-in fade-in-50 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
  {
    variants: {
      variant: {
        default: "bg-white text-primary-950",
        danger: "bg-danger-100 border-danger-700 text-danger-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface TooltipProps extends VariantProps<typeof tooltipVariants> {
  /** The node that appears on hover */
  children: React.ReactElement;
  /** The node that the tooltip appears above on hover */
  content?: React.ReactNode;
  contentClass?: string;
  triggerClass?: string;
  sideOffset?: number;
  open?: boolean;
  asChild?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A component that returns a tooltip.
 * @param content The node that appears on hover.
 * @param children The node that the tooltip appears above on hover.
 * @param sideOffset The offset from the side of the trigger node.
 * @returns A React component that renders a tooltip.
 * @example
 * ```tsx
 * <Tooltip content="This is a tooltip that will appear when you hover over the button that says 'Hover me'.">Hover me</Tooltip>
 * ```
 * @example
 * ```tsx
 * <Tooltip content="This is a tooltip with a Link component as the trigger."><Link href='/'>Hover me</Link></Tooltip>
 * ```
 * @see {@link https://www.radix-ui.com/docs/primitives/components/tooltip Radix UI Tooltip documentation}
 */
export function Tooltip({
  children,
  content,
  sideOffset = 4,
  contentClass,
  triggerClass,
  variant,
  open,
  onOpenChange,
  asChild,
}: TooltipProps): ReactElement {
  return (
    <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <TooltipPrimitive.TooltipTrigger
        className={triggerClass}
        children={children}
        asChild={asChild}
      />
      {/* The tooltip is rendered outside the DOM tree of the trigger node with the portal. */}
      {/* This is necessary for things like the vehicle parameters tooltips. */}
      {/* Without it, the tooltips are on different stacking contexts to their siblings, and are blocked. */}
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sticky="always"
          sideOffset={sideOffset}
          className={clsx(contentClass, tooltipVariants({ variant }))}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export const defaultTooltipProvider = makeProvider(TooltipProvider, {});
