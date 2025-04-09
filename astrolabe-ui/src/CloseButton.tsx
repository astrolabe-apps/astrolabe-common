import clsx from "clsx";

export function CloseButton({
	onClick,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			{...props}
			className={clsx("absolute right-3 top-2", props.className)}
		>
			<span className="sr-only">Close</span>
			<i className="fa-light fa-xmark cursor-pointer" />
		</button>
	);
}
