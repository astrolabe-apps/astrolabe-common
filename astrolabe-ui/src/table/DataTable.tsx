import React, { useEffect } from "react";
import { DataTableView, useClientSideFilter, useDataTableState } from "./index";
import { ColumnDef, DataGridClasses } from "@astroapps/datagrid";

export interface DataTableProps<T, D> extends DataGridClasses {
  columns: ColumnDef<T, D>[];
  data: T[];
  loading: boolean;
  rowId?: (row: T, index: number) => string | number;
  pageSize?: number;
  query?: string;
  paged?: boolean;
}

export function DataTable<T, D = unknown>({
  data,
  loading,
  pageSize,
  ...props
}: DataTableProps<T, D>) {
  const state = useDataTableState({ perPage: pageSize ?? 10, loading });

  useEffect(() => {
    state.fields.loading.value = loading;
    state.fields.perPage.value = pageSize ?? 10;
  }, [loading, pageSize]);

  const [pageProps] = useClientSideFilter(
    state,
    props.columns,
    data,
    props.paged ?? true,
  );
  return <DataTableView {...props} {...pageProps} state={state} />;
}
