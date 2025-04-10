import { useInput } from "@mui/base";
import { Control, formControlProps } from "@react-typed-forms/core";
import { UseInputParameters } from "@mui/base/useInput/useInput.types";
import React, { ReactElement } from "react";
import { cn } from "@astroapps/client";

export function SearchField<T>({
	control,
	placeholder,
	className,
	widthClass,
	renderInput = (p) => <input {...p} />,
	...props
}: SearchInputProps<T>) {
	const { disabled, onBlur, onChange } = formControlProps(control);

	const { getInputProps } = useInput({
		value: control.value,
		disabled: disabled,
		onChange: onChange,
		onBlur: onBlur,
		...props,
	});

	return (
		<div
			data-cy={"search-field"}
			className={cn("relative flex items-center", widthClass ?? "w-fit")}
		>
			<label className="sr-only" htmlFor={control.uniqueId.toString()}>
				Search
			</label>
			{renderInput({
				className: cn(className, "input-field relative w-full"),
				type: "text",
				placeholder: placeholder,
				id: control.uniqueId.toString(),
				...getInputProps(),
			})}
			<i
				onClick={() => control.element?.focus()}
				className="fa-regular fa-magnifying-glass text-surface-400 absolute right-0 w-8"
			>
				&nbsp;
			</i>
		</div>
	);
}

export interface SearchInputProps<T> extends UseInputParameters {
	control: Control<T>;
	placeholder?: string;
	className?: string;
	widthClass?: string;
	renderInput?: (
		inputProps: React.InputHTMLAttributes<HTMLInputElement> & {
			ref: React.Ref<HTMLInputElement>;
		},
	) => ReactElement;
}
