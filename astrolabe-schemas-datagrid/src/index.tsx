import {
  ColumnDefInit,
  columnDefinitions,
  ColumnHeader,
  DataGrid,
} from "@astroapps/datagrid";
import { Control, useTrackedComponent } from "@react-typed-forms/core";
import React, { ReactNode, useMemo } from "react";
import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayActionOptions,
  boolField,
  buildSchema,
  ChildRenderer,
  compoundField,
  ControlAdornment,
  ControlDataContext,
  ControlDefinition,
  ControlDefinitionExtension,
  ControlDefinitionType,
  createArrayActions,
  createDataRenderer,
  createGroupRenderer,
  CustomRenderOptions,
  DataControlDefinition,
  EvalExpressionHook,
  getLengthRestrictions,
  mergeObjects,
  RenderOptions,
  SchemaField,
  stringField,
  useDynamicHooks,
} from "@react-typed-forms/schemas";

interface DataGridOptions extends ArrayActionOptions {
  noEntriesText?: string;
}

type ColumnOptions = Pick<
  ColumnHeader,
  "cellClass" | "headerCellClass" | "columnTemplate" | "bodyCellClass" | "title"
> & {
  renderOptions?: RenderOptions;
  rowIndex?: boolean;
  layoutClass?: string;
};

const ColumnOptionsFields = buildSchema<ColumnOptions>({
  columnTemplate: stringField("Column Template"),
  title: stringField("Title"),
  headerCellClass: stringField("Header Cell Class"),
  bodyCellClass: stringField("Body Cell Class"),
  cellClass: stringField("Cell Class"),
  rowIndex: boolField("Show row index"),
  layoutClass: stringField("Layout Class"),
  renderOptions: compoundField("Render Options", [], {
    schemaRef: "RenderOptions",
  }),
});

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

export const DataGridAdornmentDefinition: CustomRenderOptions = {
  name: "Column Options",
  value: "ColumnOptions",
  fields: ColumnOptionsFields,
};

export const DataGridDefinition: CustomRenderOptions = {
  name: "Data Grid",
  value: "DataGrid",
  fields: DataGridFields,
};

export const DataGridGroupDefinition: CustomRenderOptions = {
  name: "Data Grid",
  value: "DataGrid",
  fields: [],
};

export const DataGridExtension: ControlDefinitionExtension = {
  RenderOptions: DataGridDefinition,
  ControlAdornment: DataGridAdornmentDefinition,
  GroupRenderOptions: DataGridGroupDefinition,
};

export function collectColumnClasses(c: ControlDefinition) {
  return (
    c.adornments?.flatMap((x) =>
      isColumnAdornment(x)
        ? [x.cellClass, x.headerCellClass, x.bodyCellClass]
        : [],
    ) ?? []
  );
}

function isColumnAdornment(
  c: ControlAdornment,
): c is ColumnOptions & ControlAdornment {
  return c.type === DataGridAdornmentDefinition.value;
}

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
      const constantColumns: ColumnDefInit<Control<any>>[] =
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
      const columns: ColumnDefInit<Control<any>>[] = childDefinitions.map(
        (d, i) => {
          const colOptions = d.adornments?.find(isColumnAdornment);
          return {
            ...colOptions,
            id: "c" + i,
            title: d.title ?? "Column " + i,
            render: (_: Control<any>, rowIndex: number) =>
              renderChild(i, d, {
                dataContext: {
                  ...dataContext,
                  path: [...dataContext.path, rowIndex],
                },
              }),
          };
        },
      );
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
  columns: ColumnDefInit<Control<any>>[];
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
  const allColumns = columnDefinitions<Control<any>>(...columns, {
    id: "deleteCheck",
    columnTemplate: "auto",
    render: (r, rowIndex) => (
      <div className="flex items-center h-full pl-1">
        {removeAction && !readonly && renderAction(removeAction(rowIndex))}
      </div>
    ),
  });
  const rowCount = control.elements?.length ?? 0;
  return (
    <>
      <DataGrid
        className={className}
        columns={allColumns}
        bodyRows={rowCount}
        getBodyRow={(i) => control.elements![i]}
        defaultColumnTemplate="1fr"
        cellClass=""
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

export const DataGridGroupRenderer = createGroupRenderer(
  ({
    renderChild,
    definition,
    renderOptions,
    childDefinitions,
    useChildVisibility,
    dataContext,
  }) => {
    const allVisibilities = Object.fromEntries(
      childDefinitions.flatMap((cd, i) => [
        [i.toString(), useChildVisibility(cd)],
        ...(cd.children?.map(
          (cd2, l2) => [i + "_" + l2, useChildVisibility(cd2)] as const,
        ) ?? []),
      ]),
    );

    return (
      <DataGridGroup
        renderChild={renderChild}
        definition={definition}
        visibleChildren={allVisibilities}
        dataContext={dataContext}
        childDefinitions={childDefinitions}
      />
    );
  },
  { renderType: DataGridDefinition.value },
);

function DataGridGroup({
  visibleChildren,
  ...props
}: {
  visibleChildren: Record<string, EvalExpressionHook<boolean>>;
  definition: ControlDefinition;
  childDefinitions: ControlDefinition[];
  dataContext: ControlDataContext;
  renderChild: ChildRenderer;
}) {
  const visibilityHooks = useDynamicHooks(visibleChildren);
  const Render = useTrackedComponent<{
    definition: ControlDefinition;
    childDefinitions: ControlDefinition[];
    dataContext: ControlDataContext;
    renderChild: ChildRenderer;
  }>(
    ({ renderChild, definition, childDefinitions, dataContext }) => {
      const visibilities = visibilityHooks(dataContext);
      const visibleRows = useMemo(
        () =>
          childDefinitions.map((_, i) => {
            let rowCount = 0;
            const visibleRows: number[] = [];
            let hasKey = false;
            do {
              const cellKey = `${i}_${rowCount}`;
              hasKey = cellKey in visibilities;
              if (hasKey && visibilities[cellKey].value) {
                visibleRows.push(rowCount);
              }
              rowCount++;
            } while (hasKey);
            return visibleRows;
          }),
        [childDefinitions, visibilities],
      );
      const maxRows = visibleRows.reduce((m, x) => Math.max(x.length, m), 0);

      const constantColumns: ColumnDefInit<undefined>[] =
        definition.adornments?.filter(isColumnAdornment).map((x, i) => {
          return {
            ...x,
            id: "cc" + i,
            render: (_, ri) => (x.rowIndex ? ri + 1 : <></>),
          };
        }) ?? [];

      const columns: ColumnDefInit<undefined>[] = childDefinitions.map(
        (d, i) => {
          const colOptions = d.adornments?.find(isColumnAdornment);
          return {
            ...colOptions,
            id: "c" + i,
            title: d.title ?? "Column " + i,
            render: (_, rowIndex: number) => {
              const childIndex = visibleRows[i][rowIndex];
              return childIndex == null
                ? ""
                : renderChild(i, d.children![childIndex]);
            },
          };
        },
      );
      const allColumns = constantColumns.concat(columns);
      return (
        <DataGrid
          columns={columnDefinitions(...allColumns)}
          bodyRows={maxRows}
          getBodyRow={() => undefined}
        />
      );
    },
    [visibilityHooks],
  );
  return <Render {...props} />;
}
