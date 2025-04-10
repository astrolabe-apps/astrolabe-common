import { Control, Finput } from "@react-typed-forms/core";
import React from "react";
import clsx from "clsx";

// TODO add a clear button
export function SearchField({
	control,
	className,
	widthClass,
	...props
}: {
	control: Control<string>;
	widthClass?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<div className={clsx("relative flex items-center", widthClass ?? "w-fit")}>
			<label className="sr-only" htmlFor={control.uniqueId.toString()}>
				Search
			</label>
			<Finput
				id={control.uniqueId.toString()}
				className={clsx(className, "input-field relative w-full")}
				control={control}
				{...props}
			/>
			<i
				onClick={() => control.element?.focus()}
				className="fa-regular fa-magnifying-glass text-surface-400 absolute right-0 w-8"
			>
				&nbsp;
			</i>
		</div>
	);
}
