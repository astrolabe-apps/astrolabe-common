"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";

import { cn } from "@astroapps/client";
import { Control, useControl } from "@react-typed-forms/core";
import {
	AccordionMultipleProps,
	AccordionSingleProps,
} from "@radix-ui/react-accordion";

const AccordionRoot = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
	<AccordionPrimitive.Item ref={ref} className={cn("", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
	<AccordionPrimitive.Header className="flex">
		<AccordionPrimitive.Trigger
			ref={ref}
			className={cn(
				"hover:bg-surface-50 flex flex-1 items-center justify-between p-3 font-medium transition-all [&[data-state=open]>i]:rotate-180",
				className,
			)}
			{...props}
		>
			{children}
			<i
				aria-hidden
				className="fa-solid fa-chevron-down h-4 w-4 shrink-0 transition-transform duration-200"
			/>
		</AccordionPrimitive.Trigger>
	</AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<AccordionPrimitive.Content
		ref={ref}
		className={cn(
			"pb-4 pt-0 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all",
			className,
		)}
		{...props}
	>
		{children}
	</AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

type AccordionSingleExtendedProps = AccordionSingleProps & {
	controlValue?: Control<string | undefined>;
};
type AccordionMultipleExtendedProps = AccordionMultipleProps & {
	controlValue?: Control<string[] | undefined>;
};

type AccordionType = {
	className?: string;
	contentChildren: {
		title: React.ReactNode;
		contents: React.ReactNode;
	}[];
	itemClass?: string;
	triggerClass?: string;
	contentClass?: string;
};

function Accordion(
	props: AccordionType &
		(AccordionSingleExtendedProps | AccordionMultipleExtendedProps),
) {
	if (props.type === "single") {
		return <AccordionSingle {...props} />;
	} else {
		return <AccordionMultiple {...props} />;
	}
}

function AccordionSingle(props: AccordionSingleExtendedProps & AccordionType) {
	let { contentChildren, itemClass, controlValue, ...restProps } = props;
	controlValue ??= useControl<string | undefined>(undefined);
	return (
		<AccordionRoot
			value={controlValue ? controlValue.value : undefined}
			onValueChange={(v: string) => {
				if (controlValue) {
					controlValue.value = v;
				}
			}}
			{...restProps}
		>
			<AccordionItemsRenderer
				children={contentChildren}
				itemClass={itemClass}
			/>
		</AccordionRoot>
	);
}

function AccordionMultiple(
	props: AccordionMultipleExtendedProps & AccordionType,
) {
	let {
		contentChildren,
		itemClass,
		controlValue,
		triggerClass,
		contentClass,
		...restProps
	} = props;
	controlValue ??= useControl<string[]>([]);
	return (
		<AccordionRoot
			value={controlValue ? controlValue.value : undefined}
			onValueChange={(v: string[]) => {
				if (controlValue) {
					controlValue.value = v;
				}
			}}
			{...restProps}
		>
			<AccordionItemsRenderer
				children={contentChildren}
				itemClass={itemClass}
				triggerClass={triggerClass}
				contentClass={contentClass}
			/>
		</AccordionRoot>
	);
}

function AccordionItemsRenderer({
	children,
	itemClass,
	triggerClass,
	contentClass,
}: {
	children: {
		contents: React.ReactNode;
		title: React.ReactNode;
	}[];
	itemClass?: string;
	triggerClass?: string;
	contentClass?: string;
}) {
	return (
		<>
			{children.map((child, i) => (
				<AccordionItems
					key={i}
					title={child.title}
					children={child.contents}
					className={itemClass}
					triggerClass={triggerClass}
					contentClass={contentClass}
				/>
			))}
		</>
	);
}

function AccordionItems({
	children,
	title,
	className,
	triggerClass,
	contentClass,
}: {
	children: React.ReactNode;
	title: React.ReactNode;
	className?: string;
	triggerClass?: string;
	contentClass?: string;
}) {
	return (
		<AccordionItem
			value={title?.toString() ?? Math.random().toString()}
			className={className}
		>
			<AccordionTrigger className={triggerClass}>{title}</AccordionTrigger>
			<AccordionContent className={contentClass}>{children}</AccordionContent>
		</AccordionItem>
	);
}

export {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionRoot,
	AccordionTrigger,
};
