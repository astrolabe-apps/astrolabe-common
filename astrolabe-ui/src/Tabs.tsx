import * as Prim from "@radix-ui/react-tabs";
import { Control, RenderArrayElements } from "@react-typed-forms/core";
import { ReactNode } from "react";
import clsx from "clsx";
import { cva, VariantProps } from "class-variance-authority";
import { cn } from "@astroapps/client";

const tabVariants = cva(
	cn(
		"cursor-pointer select-none outline-none disabled:pointer-events-none disabled:opacity-50 transition-all",
		"px-5 min-h-11",
		"flex flex-1 items-center justify-center",
		"transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 data-[state=active]:shadow-[inset_0_-1px_0_0] shadow-primary-500",
		"text-lg leading-none",
		"first:rounded-tl-md last:rounded-tr-md",
	),
	{
		variants: {
			color: {
				primary:
					"text-primary-500 hover:text-primary-500 data-[state=active]:text-primary-600",
				secondary:
					"text-secondary-500 hover:text-secondary-500 data-[state=active]:text-secondary-600",
			},
		},
		defaultVariants: {
			color: "primary",
		},
	},
);

const listVariants = cva("shrink-0 flex border-b overflow-x-auto", {
	variants: {
		color: {
			primary: "border-primary",
			secondary: "border-secondary",
		},
	},
	defaultVariants: {
		color: "primary",
	},
});

export interface TabContent {
	id: string;
	title: ReactNode;
	content: ReactNode;
}

export type TabsProps = {
	className?: string;
	triggerClass?: string;
	listClass?: string;
	contentClass?: string;
	control: Control<string>;
	tabs: TabContent[];
} & VariantProps<typeof tabVariants>;

export function Tabs({
	className,
	control,
	tabs,
	listClass,
	contentClass,
	triggerClass,
	...props
}: TabsProps) {
	const value = control.value;
	const trigger = tabVariants(props);
	return (
		<Prim.Root
			className={cn("flex flex-col", className)}
			value={value}
			onValueChange={(v) => (control.value = v)}
		>
			<Prim.List className={cn(listVariants(props), listClass)}>
				<RenderArrayElements
					array={tabs}
					children={(v) => (
						<Prim.Trigger
							role="tab"
							className={cn(trigger, triggerClass)}
							value={v.id}
						>
							{v.title}
						</Prim.Trigger>
					)}
				/>
			</Prim.List>
			<RenderArrayElements
				array={tabs}
				children={(v) => (
					<Prim.Content role="tabpanel" className={contentClass} value={v.id}>
						{v.content}
					</Prim.Content>
				)}
			/>
		</Prim.Root>
	);
}
