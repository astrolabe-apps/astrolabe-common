import { findSortField, SearchingState } from "@astroapps/client";

import { ReactNode } from "react";
import clsx from "clsx";
import { ColumnDef } from "@astroapps/datagrid";
import { rotateSort } from "./index";

export function SortableHeader({
	state,
	column,
	sortField,
	children,
}: {
	state: SearchingState;
	column: ColumnDef<any, unknown>;
	sortField: string;
	children: ReactNode;
}) {
	const { sort, page } = state.fields;

	const sorts = sort.value;
	const currentSort = findSortField(sorts, sortField);
	const currentDir = currentSort?.[1];
	return (
		<label
			className="inline-flex gap-2 items-end text-start cursor-pointer"
			onClick={() => {
				sort.setValue(rotateSort(column));
				page.value = 0;
			}}
		>
			{children}
			{currentDir && (
				<i
					className={clsx(
						"fa-light h-4 w-2",
						currentDir === "asc" ? "fa-arrow-up" : "fa-arrow-down",
					)}
				/>
			)}
		</label>
	);
}
