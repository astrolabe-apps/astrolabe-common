import { ControlTreeItemProps, useSortableTreeItem } from "./ControlTree";
import { clsx } from "clsx";

export function DefaultTreeItem(props: ControlTreeItemProps) {
	const { title, indentationWidth, clone, actions, onCollapse, node } = props;
	const {
		itemProps,
		handleProps,
		setDroppableNodeRef,
		setDraggableNodeRef,
		paddingLeft,
		canHaveChildren,
		isDragging,
		isSelected,
	} = useSortableTreeItem(props);

	return (
		<div
			className={clsx(
				clone && "inline-block",
				isDragging && "opacity-50",
				"cursor-pointer"
			)}
			ref={setDroppableNodeRef}
			style={{ paddingLeft }}
		>
			<div
				className={clsx(
					"flex gap-2 relative border items-center justify-between min-h-[40px] px-2 py-1",
					isSelected && "bg-surface-200"
				)}
				{...itemProps}
				ref={setDraggableNodeRef}
			>
				<div className="flex gap-2 items-center truncate min-h-0 h-full">
					<div
						className="min-w-[40px] flex justify-center cursor-grabbing"
						{...handleProps}
					>
						<i className="fa fa-grip-vertical " />
						<span className="sr-only">Drag to reorder</span>
					</div>
					{canHaveChildren && (
						<button
							onClick={() => onCollapse?.()}
							// disabled={node.childrenNodes.length === 0}
							aria-expanded={node.expanded}
							className={clsx(
								"transition-transform disabled:text-surface-300 h-full min-w-[40px] flex justify-center",
								node.expanded && "rotate-90"
							)}
						>
							<i className="fa fa-chevron-right" />
							<span className="sr-only">Toggle children</span>
						</button>
					)}
					<div className="truncate w-full grow-1">{title}</div>
				</div>
				<div className="flex gap-2">{actions}</div>
			</div>
		</div>
	);
}
