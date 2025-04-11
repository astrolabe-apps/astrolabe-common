import { useAutocomplete } from "@mui/base";
import * as React from "react";
import { Key, ReactElement, ReactNode } from "react";
import { Control, useControl } from "@react-typed-forms/core";
import { UseAutocompleteProps } from "@mui/base/useAutocomplete/useAutocomplete";

export const defaultAutocompleteClasses: AutocompleteClasses = {
	container: "relative",
	label: "font-bold",
	optionList:
		"absolute border border-black p-2 rounded cursor-pointer bg-white",
	input: "w-full",
	option: "",
};

export interface AutocompleteInputProps<A>
	extends UseAutocompleteProps<A, false, false, true> {
	label?: ReactNode;
	textControl?: Control<string>;
	selectedControl?: Control<A | null>;
	options: A[];
	getOptionText: (a: A) => string;
	getOptionMatchText?: (a: A) => string;
	getOptionContent?: (a: A) => ReactNode;
	inputPlaceholder?: string;
	pinnedOptions?: ReactNode;
	renderOption?: (
		props: React.HTMLAttributes<HTMLLIElement>,
		key: Key,
		a: A,
		i: number,
	) => ReactElement;
	classes?: Partial<AutocompleteClasses>;
	renderInput?: (
		inputProps: React.InputHTMLAttributes<HTMLInputElement> & {
			ref: React.Ref<HTMLInputElement>;
		},
	) => ReactElement;
	dontFilter?: boolean;
}

export interface AutocompleteClasses {
	container: string;
	label: string;
	input: string;
	optionList: string;
	option: string;
}

export function AutocompleteInput<A>({
	getOptionText,
	options,
	inputPlaceholder,
	label,
	getOptionMatchText = getOptionText,
	renderOption = defaultRenderOption,
	pinnedOptions,
	textControl: tc,
	selectedControl: sc,
	classes,
	getOptionContent,
	renderInput = (p) => <input {...p} />,
	dontFilter,
	...useProps
}: AutocompleteInputProps<A>) {
	const textControl = useControl("", { use: tc });
	const selectedControl = useControl(null, { use: sc });

	const {
		getRootProps,
		getInputLabelProps,
		getInputProps,
		getListboxProps,
		getOptionProps,
		groupedOptions,
	} = useAutocomplete<A, false, false, true>({
		options,
		freeSolo: true,
		value: selectedControl.value,
		getOptionLabel: (v) => (typeof v === "string" ? v : getOptionText(v)),
		filterOptions: (o, s) =>
			dontFilter
				? o
				: o.filter((o) =>
						getOptionMatchText(o)
							.toLowerCase()
							.includes(s.inputValue.toLowerCase()),
					),
		inputValue: textControl.value,
		onChange: (e, v, reason, d) => {
			if (reason === "selectOption") selectedControl.value = v as A;
		},
		onInputChange: (e, v, reason) => {
			textControl.value = v;
			if (reason === "input") selectedControl.value = null;
		},
		...useProps,
	});
	const {
		label: labelClass,
		optionList,
		input,
		container,
		option,
	} = {
		...defaultAutocompleteClasses,
		...classes,
	};

	return (
		<div className={container}>
			<div {...getRootProps()}>
				{label && (
					<label className={labelClass} {...getInputLabelProps()}>
						{label}
					</label>
				)}
				{renderInput({
					className: input,
					type: "text",
					placeholder: inputPlaceholder,
					...getInputProps(),
				})}
			</div>
			{groupedOptions.length > 0 ? (
				<ul className={optionList} {...getListboxProps()}>
					{(groupedOptions as A[]).map((x, i) => {
						const { key, ...optionProps } = getOptionProps({
							index: i,
							option: x,
						}) as React.HTMLAttributes<HTMLLIElement> & { key: Key };
						optionProps.className = option;
						optionProps.children = getOptionContent?.(x) ?? getOptionText(x);
						return renderOption(optionProps, key, x, i);
					})}
				</ul>
			) : null}
		</div>
	);
}

function defaultRenderOption(
	props: React.HTMLAttributes<HTMLLIElement>,
	key: Key,
) {
	return <li key={key} {...props} />;
}
