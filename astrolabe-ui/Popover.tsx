"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@astrolabe/client/util/utils";
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
}

export function Popover({
	children,
	content,
	className,
	open,
	onOpenChange,
	triggerClass,
	// ref,
	...props
}: PopoverProps) {
	return (
		<PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<PopoverPrimitive.PopoverTrigger className={triggerClass}>
				{children}
			</PopoverPrimitive.PopoverTrigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					{...props}
					className={cn(
						"text-primary-950 animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 rounded-md border bg-white p-4 shadow-md outline-none",
						className
					)}
					children={content}
				/>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}
