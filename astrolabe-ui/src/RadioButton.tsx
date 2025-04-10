import { Control, formControlProps } from "@react-typed-forms/core";
import React from "react";

type RadioButtonProps<T> = React.HTMLProps<HTMLInputElement> & {
	control: Control<T | undefined | null>;
	radioValue: T;
	valueString?: (t: T) => string;
};

/**
 * Radio button component
 *
 * Currently supports string, number, boolean value type
 *
 * @param control the value of the radio button group, supports string, number, boolean
 * @param radioValue the value of the radio button, if the value is the same as the value of {@link control} radio button group,
 * it will be checked
 * @param disabled whether the radio button is disabled
 * @param className tailwind css styles
 * @param valueString function to convert a value to string
 * @param inputProps Extra input props
 *
 * @example
 * const control: Control<boolean|undefined> = useControl()
 *
 * 	<label htmlFor={radioButtonTrue} className="flex flex-row-reverse items-center gap-2">
 * 			<RadioButton
 * 				id={radioButtonTrue}
 * 				control={control}
 * 				radioValue={true}
 * 			>
 * 			<span>Yes</span>
 * 	</label>
 * 	<label htmlFor={radioButtonFalse} className="flex flex-row-reverse items-center gap-2">
 * 			<RadioButton
 * 				id={radioButtonFalse}
 * 				control={control}
 * 				radioValue={false}
 * 			/>
 * 			<span>No</span>
 * 	</label>
 *
 */

export function RadioButton<T>({
	control,
	radioValue,
	disabled,
	className,
	valueString = (t: T) => t?.toString() ?? "",
	...inputProps
}: RadioButtonProps<T>): JSX.Element {
	const {
		errorText,
		value: defValue,
		onChange,
		ref,
		...props
	} = formControlProps<T | undefined | null, HTMLInputElement>(control);

	const innerValue = valueString(radioValue);
	const innerDefValue = defValue != null ? valueString(defValue) : "";

	return (
		<input
			{...props}
			onChange={(e) => (e.target.checked ? (control.value = radioValue) : null)}
			className={className}
			type="radio"
			name={"radio-" + control.uniqueId}
			value={innerValue}
			checked={innerValue === innerDefValue}
			disabled={props.disabled || disabled}
			{...inputProps}
		/>
	);
}
