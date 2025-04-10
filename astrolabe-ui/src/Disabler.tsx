import {
	Control,
	controlValues,
	RenderControl,
	useControl,
	useControlEffect,
} from "@react-typed-forms/core";
import { ReactElement, useEffect } from "react";
import { Textfield } from "./Textfield";

export function Disabler<A>({
	control,
	label,
	render,
}: {
	control: Control<A | null | undefined>;
	label: string;
	render: (params: { control: Control<A | null | undefined> }) => ReactElement;
}) {
	const wrapped = useControl(() => control.value, {
		afterCreate: (c) => {
			c.disabled = true;
			control.disabled = true;
		},
	});
	const different = useControl(() => "Differing Values", {
		afterCreate: (c) => (c.disabled = true),
	});
	useControlEffect(
		() => ({ value: wrapped.value, disabled: wrapped.disabled }),
		({ value, disabled }) => {
			control.value = !disabled
				? value === undefined
					? null
					: value
				: control.initialValue;
			if (disabled) {
				wrapped.value = control.initialValue;
			}
			control.disabled = disabled;
		}
	);
	return (
		<div className="flex">
			<RenderControl
				render={() => (
					<input
						type="checkbox"
						checked={!wrapped.disabled}
						className="ml-1 mr-3 mt-6"
						onChange={() => {
							wrapped.disabled = !wrapped.disabled;
						}}
					/>
				)}
			/>
			{wrapped.disabled && control.value === undefined ? (
				<Textfield control={different} label={label} />
			) : (
				render({ control: wrapped })
			)}
		</div>
	);
}
