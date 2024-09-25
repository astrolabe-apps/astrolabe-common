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
  DynamicHookGenerator,
  EvalExpressionHook,
  getLengthRestrictions,
  isDataControlDefinition,
  makeHookDepString,
  mergeObjects,
  RenderOptions,
  stringField,
  toDepString,
} from "@react-typed-forms/schemas";
import {
  ColumnDef,
  ColumnDefInit,
  columnDefinitions,
  DataGrid,
} from "@astroapps/datagrid";
import {
  Control,
  useComputed,
  useTrackedComponent,
} from "@react-typed-forms/core";
import React, { ReactNode, useCallback } from "react";
import { isColumnAdornment } from "./columnAdornment";
import { FilterPopover } from "./FilterPopover";

interface DataGridOptions extends ArrayActionOptions {
  noEntriesText?: string;
}

interface DataGridColumnExtension {
  dataContext: ControlDataContext;
  definition: ControlDefinition;
  evalHidden?: EvalExpressionHook<boolean>;
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
        definition,
        renderChild,
        renderOptions,
        childDefinitions,
        field,
        className,
        readonly,
        required,
        useEvalExpression,
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
                : renderChild("c" + i + "_" + ri, def, { elementIndex: ri }),
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
              evalHidden: useEvalExpression(
                colOptions?.visible,
                (x) => !!x,
              ) as EvalExpressionHook<boolean>,
            },
            render: (_: Control<any>, rowIndex: number) =>
              renderChild(i, d, {
                parentDataNode: dataContext.dataNode!.getChildElement(rowIndex),
              }),
          };
        });
      const allColumns = constantColumns.concat(columns);

      return (
        <DynamicGridVisibility
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

function DynamicGridVisibility(props: DataGridRendererProps) {
  const depString = makeHookDepString(
    props.columns.map((x) => x.data?.evalHidden),
    (x) => x?.deps,
  );

  const Render = useTrackedComponent<DataGridRendererProps>(
    (props: DataGridRendererProps) => {
      const newColumns = props.columns.map((x) => {
        const data = x.data;
        if (data && data.evalHidden) {
          const visible = data.evalHidden.runHook(
            data.dataContext,
            data.evalHidden.state,
          );
          if (visible) return { ...x, hidden: !visible.value };
        }
        return x;
      });
      return <DataGridControlRenderer {...props} columns={newColumns} />;
    },
    [depString],
  );
  return <Render {...props} />;
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
