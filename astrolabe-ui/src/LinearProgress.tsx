"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@astroapps/client";

type ProgressVariant = "complete" | "indeterminate" | "loading";

interface ProgressProps
	extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
	variant?: ProgressVariant;
}

/**
 * A linear progress bar component that displays the progress of a task.
 * It uses the Radix UI Progress component to render the progress bar.
 * @see https://ui.shadcn.com/docs/components/progress
 */
const LinearProgress = React.forwardRef<
	React.ElementRef<typeof ProgressPrimitive.Root>,
	ProgressProps
>(({ className, value, variant, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		data-state={variant}
		className={cn(
			"bg-surface-500 relative h-4 w-full overflow-hidden rounded-full",
			className,
		)}
		{...props}
	>
		{variant === "indeterminate" ? (
			<ProgressPrimitive.Indicator
				data-state={variant}
				className="bg-primary-500 indeterminate:animate-indeterminate-progress animate-indeterminate-progress h-full w-1/3 flex-1 transition-all"
			/>
		) : (
			<ProgressPrimitive.Indicator
				data-state={variant}
				className="bg-primary-500 h-full w-full flex-1 transition-all"
				style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
			/>
		)}
	</ProgressPrimitive.Root>
));
LinearProgress.displayName = ProgressPrimitive.Root.displayName;

export { LinearProgress };
