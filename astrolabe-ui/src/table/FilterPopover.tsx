import { Popover } from "../Popover";
import { SearchingState } from "@astroapps/client";

import {
	RenderArrayElements,
	RenderControl,
	useComputed,
} from "@react-typed-forms/core";
import { ColumnDef } from "@astroapps/datagrid";
import { setFilterValue } from "./index";

export function FilterPopover({
	state,
	column,
	filterField,
	useFilterValues,
}: {
	state: SearchingState;
	column: ColumnDef<any, unknown>;
	filterField: string;
	useFilterValues(field: string): [string, string][];
}) {
	return (
		<Popover
			content={<RenderControl render={showValues} />}
			className="w-72 grid"
		>
			<i aria-hidden className="fa-light fa-filter" />{" "}
		</Popover>
	);

	function showValues() {
		const filterValues = useFilterValues(filterField);
		return (
			<RenderArrayElements
				array={filterValues}
				children={([n, v]) => {
					const checked = useComputed(() =>
						state.fields.filters.value[filterField]?.includes(v),
					).value;
					return (
						<label
							className="grid grid-cols-[auto_1fr] cursor-pointer gap-2 align-text-top"
							onClick={() => {
								state.fields.filters.setValue(
									setFilterValue(filterField, v, !checked),
								);
								state.fields.page.value = 0;
							}}
						>
							<input className="mt-0.5" type="checkbox" checked={checked} />
							<span className="inline align-middle">{n}</span>
						</label>
					);
				}}
			/>
		);
	}
}
