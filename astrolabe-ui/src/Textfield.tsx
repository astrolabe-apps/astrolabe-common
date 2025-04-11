import { Control, formControlProps } from "@react-typed-forms/core";
import clsx from "clsx";

export function Textfield({
	control,
	label,
	required = false,
	className,
	inputClass,
	...externalProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
	control: Control<string | null | undefined>;
	label: string;
	required?: boolean;
	className?: string;
	inputClass?: string;
}) {
	const id = externalProps.id ?? "c" + control.uniqueId;
	const { errorText, value, ...props } = formControlProps(control);
	return (
		<div className={clsx("flex flex-col", className)}>
			<label
				htmlFor={id}
				className={clsx(
					"font-bold",
					required && 'after:content-["*"] after:text-danger-500',
				)}
			>
				{label}
			</label>
			<input
				id={id}
				type="text"
				required={required}
				className={inputClass}
				{...props}
				{...externalProps}
				value={value == null ? "" : value}
			/>
			{errorText && (
				<p className="mt-2 text-sm text-danger-600 dark:text-danger-500">
					{errorText}
				</p>
			)}
		</div>
	);
}
