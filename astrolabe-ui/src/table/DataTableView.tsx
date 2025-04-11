import React, { Fragment } from "react";
import { RenderControl } from "@react-typed-forms/core";
import { Pagination } from "../Pagination";
import {
	ColumnDef,
	DataGrid,
	DataGridClasses,
	defaultTableClasses,
} from "@astroapps/datagrid";
import { TableBaseData } from "./index";
import { FilterPopover } from "./FilterPopover";
import { SortableHeader } from "./SortableHeader";

export interface DataTableViewProps<T, D = unknown>
	extends TableBaseData<T, D>,
		DataGridClasses {
	paged?: boolean;
}

export function DataTableView<T, D = unknown>(props: DataTableViewProps<T, D>) {
	const {
		state,
		pageRows,
		paged = true,
		getRow,
		rowId,
		useFilterValues,
		...gridProps
	} = { ...defaultTableClasses, ...props };

	function renderHeaderContent(col: ColumnDef<T>) {
		const { filterField, sortField, title } = col;
		const filtered = (
			<>
				{title}
				{filterField && (
					<FilterPopover
						state={state}
						filterField={filterField}
						column={col}
						useFilterValues={useFilterValues}
					/>
				)}
			</>
		);
		return sortField ? (
			<SortableHeader
				state={state}
				sortField={sortField}
				column={col}
				children={filtered}
			/>
		) : (
			filtered
		);
	}

	const fields = state.fields;
	const loading = fields.loading.value;
	const totalRows = fields.totalRows;
	const dataGrid = (
		<DataGrid
			bodyRows={pageRows}
			getBodyRow={getRow}
			{...gridProps}
			wrapBodyContent={(render) => <RenderControl render={render} />}
			renderHeaderContent={renderHeaderContent}
			renderExtraRows={(r) =>
				pageRows === 0 ? (
					<div
						style={{ gridRow: r, gridColumn: "1 / -1" }}
						className="text-center font-bold border-t py-4"
					>
						No data
					</div>
				) : (
					<></>
				)
			}
		/>
	);

	return !paged ? (
		dataGrid
	) : (
		<>
			{dataGrid}
			<RenderControl
				render={() =>
					totalRows.value > 0 && (
						<Pagination
							total={totalRows}
							perPage={fields.perPage}
							page={fields.page}
						/>
					)
				}
			/>
		</>
	);
}
