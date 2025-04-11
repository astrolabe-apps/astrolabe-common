import { cn } from "@astroapps/client";
export function CloseButton({
	onClick,
	label = "Close",
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	label?: string;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			type="button"
			{...props}
			className={cn(
				"absolute right-3 top-2 min-h-[44px] min-w-[44px] focus:bg-surface-100 hover:bg-surface-100 rounded-full transition-all",
				props.className,
			)}
		>
			<span className="sr-only">{label}</span>
			<i aria-hidden className="fa-light fa-xmark cursor-pointer" />
		</button>
	);
}
