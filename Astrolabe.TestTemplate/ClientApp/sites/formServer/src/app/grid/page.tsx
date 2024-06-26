"use client";
import {
  CellRenderProps,
  columnDefinitions,
  DataGrid,
  defaultRenderCell,
} from "@astroapps/datagrid";
import { DataTable } from "@astrolabe/ui/table";
import { StrictMode } from "react";

export default function DataGridTest() {
  type Row = {
    name: string;
    age: number;
  };
  const rows = [
    { name: "Jolse", age: 19 },
    { name: "Maginnis", age: 80 },
  ];
  const columns = columnDefinitions<Row>({
    title: "Component",
    renderHeader,
    headerRowSpans: [1, 1],
    renderBody: defaultRenderCell,
    children: [
      { title: "Name", getter: (r) => r.name },
      { title: "Age", getter: (r) => r.age },
    ],
  });
  return (
    <StrictMode>
      <DataTable loading={false} data={rows} columns={columns} />
    </StrictMode>
  );

  function renderHeader(p: CellRenderProps<any>) {
    return <>{defaultRenderCell(p)}</>;
  }
}
