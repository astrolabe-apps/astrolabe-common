import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayActionOptions,
  boolField,
  buildSchema,
  ControlDataContext,
  ControlDefinition,
  ControlDefinitionType,
  createArrayActions,
  createDataRenderer,
  CustomRenderOptions,
  DataControlDefinition,
  getLengthRestrictions,
  isDataControlDefinition,
  mergeObjects,
  RenderOptions,
  SchemaInterface,
  stringField,
} from "@react-typed-forms/schemas";
import {
  ColumnDef,
  ColumnDefInit,
  columnDefinitions,
  DataGrid,
} from "@astroapps/datagrid";
import { Control } from "@react-typed-forms/core";
import React, { ReactNode } from "react";
import { isColumnAdornment } from "./columnAdornment";
import { FilterPopover } from "./FilterPopover";

interface DataGridOptions extends ArrayActionOptions {
  noEntriesText?: string;
}

interface DataGridColumnExtension {
  dataContext: ControlDataContext;
  definition: ControlDefinition;
}

const DataGridFields = buildSchema<DataGridOptions>({
  addText: stringField("Add button text"),
  removeText: stringField("Remove button text"),
  addActionId: stringField("Add action id"),
  removeActionId: stringField("Remove action id"),
  noEntriesText: stringField("No entries text"),
  noAdd: boolField("No Add"),
  noRemove: boolField("No remove"),
  noReorder: boolField("No reorder"),
});
export const DataGridDefinition: CustomRenderOptions = {
  name: "Data Grid",
  value: "DataGrid",
  fields: DataGridFields,
};
export const DataGridRenderer = createDataGridRenderer();

export function createDataGridRenderer(options?: DataGridOptions) {
  return createDataRenderer(
    (pareProps, renderers) => {
      const {
        control,
        dataContext,
        parentContext,
        definition,
        renderChild,
        renderOptions,
        childDefinitions,
        field,
        className,
        readonly,
        required,
      } = pareProps;
      const dataGridOptions =
        mergeObjects(
          renderOptions as DataGridOptions & RenderOptions,
          options,
        ) ?? {};
      const constantColumns: ColumnDefInit<
        Control<any>,
        DataGridColumnExtension
      >[] =
        definition.adornments?.filter(isColumnAdornment).map((x, i) => {
          const def: DataControlDefinition = {
            type: ControlDefinitionType.Data,
            field: definition.field,
            hideTitle: true,
            renderOptions: x.renderOptions,
            layoutClass: x.layoutClass,
          };
          return {
            ...x,
            id: "cc" + i,
            render: (_, ri) =>
              x.rowIndex
                ? ri + 1
                : renderChild("c" + i + "_" + ri, def, {
                    elementIndex: ri,
                    dataContext: parentContext,
                  }),
          };
        }) ?? [];
      const columns: ColumnDefInit<Control<any>, DataGridColumnExtension>[] =
        childDefinitions.map((d, i) => {
          const colOptions = d.adornments?.find(isColumnAdornment);
          return {
            ...colOptions,
            id: "c" + i,
            title: colOptions?.title ?? d.title ?? "Column " + i,
            data: {
              dataContext,
              definition: d,
            },
            render: (_: Control<any>, rowIndex: number) =>
              renderChild(i, d, {
                dataContext: {
                  ...dataContext,
                  path: [...dataContext.path, rowIndex],
                },
              }),
          };
        });
      const allColumns = constantColumns.concat(columns);

      return (
        <DataGridControlRenderer
          renderOptions={dataGridOptions}
          renderAction={renderers.renderAction}
          control={control}
          columns={allColumns}
          className={className}
          readonly={readonly}
          {...applyArrayLengthRestrictions({
            ...createArrayActions(control, field, dataGridOptions),
            ...getLengthRestrictions(definition),
            required,
          })}
        />
      );
    },
    { renderType: DataGridDefinition.value, collection: true },
  );
}

interface DataGridRendererProps {
  renderOptions: DataGridOptions;
  columns: ColumnDefInit<Control<any>, DataGridColumnExtension>[];
  control: Control<any[] | undefined | null>;
  className?: string;
  renderAction: (action: ActionRendererProps) => ReactNode;
  readonly: boolean;
  addAction?: ActionRendererProps;
  removeAction?: (i: number) => ActionRendererProps;
}

function DataGridControlRenderer({
  renderOptions,
  columns,
  control,
  className,
  renderAction,
  readonly,
  addAction,
  removeAction,
}: DataGridRendererProps) {
  const allColumns = columnDefinitions<Control<any>, DataGridColumnExtension>(
    ...columns,
    {
      id: "deleteCheck",
      columnTemplate: "auto",
      render: (r, rowIndex) => (
        <div className="flex items-center h-full pl-1">
          {removeAction && !readonly && renderAction(removeAction(rowIndex))}
        </div>
      ),
    },
  );
  const rowCount = control.elements?.length ?? 0;

  function renderHeaderContent(
    col: ColumnDef<Control<any>, DataGridColumnExtension>,
  ) {
    const { filterField, sortField, title, data } = col;
    if (data) {
      const {
        dataContext: { schemaInterface, fields },
        definition: d,
      } = data;
      if (isDataControlDefinition(d)) {
        const theField = fields.find((x) => x.field == d.field);
        console.log(theField, filterField);
        if (theField) {
          return (
            <>
              {title}
              {filterField && (
                <FilterPopover
                  schemaInterface={schemaInterface}
                  field={theField}
                  isChecked={() => false}
                  setOption={(v, ch) => console.log({ ch, v })}
                />
              )}
            </>
          );
        }
      }
    }
    return <>{title}</>;
    // return sortField ? (
    //   <SortableHeader
    //     state={state}
    //     sortField={sortField}
    //     column={col}
    //     children={filtered}
    //   />
    // ) : (
    //   filtered
    // );
  }

  return (
    <>
      <DataGrid
        className={className}
        columns={allColumns}
        bodyRows={rowCount}
        getBodyRow={(i) => control.elements![i]}
        defaultColumnTemplate="1fr"
        cellClass=""
        renderHeaderContent={renderHeaderContent}
        renderExtraRows={(r) =>
          rowCount === 0 ? (
            <div
              style={{ gridColumn: "1 / -1" }}
              className="border-t text-center p-3"
            >
              {renderOptions.noEntriesText ?? "No data"}
            </div>
          ) : (
            <></>
          )
        }
      />
      <div className="flex justify-center mt-2">
        {addAction && !readonly && renderAction(addAction)}
      </div>
    </>
  );
}
