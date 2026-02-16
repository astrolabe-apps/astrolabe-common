import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayRenderOptions,
  boolField,
  buildSchema,
  ChildNodeInit,
  ChildNodeSpec,
  ChildRenderer,
  ControlDataContext,
  ControlDefinition,
  ControlDefinitionType,
  createArrayActions,
  createDataRenderer,
  CustomRenderOptions,
  dataControl,
  DataControlDefinition,
  DynamicPropertyType,
  EntityExpression,
  fieldPathForDefinition,
  FormStateNode,
  getExternalEditData,
  getLengthRestrictions,
  groupedControl,
  isDataControl,
  makeParamTag,
  mergeObjects,
  rendererClass,
  RenderOptions,
  resolveArrayChildren,
  RunExpression,
  schemaDataForFieldRef,
  schemaForFieldPath,
  SchemaTags,
  stringField,
  textDisplayControl,
} from "@react-typed-forms/schemas";
import {
  ColumnDef,
  ColumnDefInit,
  columnDefinitions,
  DataGrid,
} from "@astroapps/datagrid";
import {
  Control,
  ensureMetaValue,
  getMetaValue,
  groupedChanges,
  newControl,
  RenderControl,
} from "@react-typed-forms/core";
import React, { Fragment, ReactNode } from "react";
import {
  DataGridAdornmentDefinition,
  getColumnHeaderFromOptions,
  isColumnAdornment,
} from "./columnAdornment";
import { DataGridGroupDefinition } from "./DataGridGroup";
import { FilterPopover } from "./FilterPopover";
import {
  findSortField,
  rotateSort,
  SearchOptions,
  setFilterValue,
} from "@astroapps/searchstate";
import { SortableHeader } from "./SortableHeader";
import { useGroupedRows } from "./util";

interface DataGridOptions
  extends Pick<
    ArrayRenderOptions,
    | "addText"
    | "addActionId"
    | "removeText"
    | "removeActionId"
    | "noAdd"
    | "noRemove"
    | "noReorder"
    | "editExternal"
    | "editText"
    | "editActionId"
  > {
  noEntriesText?: string;
  searchField?: string;
  displayOnly?: boolean;
  groupByField?: string;
  disableClear?: boolean;
}

interface DataGridClasses {
  className?: string;
  popoverClass?: string;
  titleContainerClass?: string;
  removeColumnClass?: string;
  addContainerClass?: string;
  noEntriesClass?: string;
  headerCellClass?: string;
  cellClass?: string;
  bodyCellClass?: string;
  clearFilterClass?: string;
  clearFilterText?: string;
}

interface DataGridColumnExtension {
  dataContext: ControlDataContext;
  definition: ControlDefinition;
}

const dataGridGroupOptions = {
  tags: [makeParamTag(SchemaTags.ControlGroup, "DataGridOptions")],
};

const DataGridFields = buildSchema<DataGridOptions>({
  addText: stringField("Add button text"),
  removeText: stringField("Remove button text"),
  editText: stringField("Edit button text"),
  addActionId: stringField("Add action id"),
  removeActionId: stringField("Remove action id"),
  editActionId: stringField("Edit action id"),
  noAdd: boolField("No Add"),
  noRemove: boolField("No remove"),
  noReorder: boolField("No reorder"),
  editExternal: boolField("Edit external"),
  displayOnly: boolField("Display only", dataGridGroupOptions),
  disableClear: boolField("Disable clear filter", dataGridGroupOptions),
  noEntriesText: stringField("No entries text", dataGridGroupOptions),
  searchField: stringField("Search state field", dataGridGroupOptions),
  groupByField: stringField("Group by field", dataGridGroupOptions),
});
export const DataGridDefinition: CustomRenderOptions = {
  name: "Data Grid",
  value: "DataGrid",
  fields: DataGridFields,
  applies: (sf) => !!sf.field.collection,
  groups: [
    {
      parent: "RenderOptions",
      group: {
        type: ControlDefinitionType.Group,
        children: [],
        id: "DataGridOptions",
      },
    },
  ],
};

export const defaultDataGridClasses: DataGridClasses = {
  popoverClass:
    "text-primary-950 animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 rounded-md border bg-white p-4 shadow-md outline-none",
  titleContainerClass: "flex gap-2",
  addContainerClass: "flex justify-center mt-2",
  removeColumnClass: "flex items-center h-full pl-1 gap-2",
  noEntriesClass: "border-t text-center p-3",
  headerCellClass: "font-bold",
  cellClass: "",
  bodyCellClass: "border-t py-1 flex items-center",
  clearFilterClass: "underline font-bold",
  clearFilterText: "Clear",
};
export const DataGridRenderer = createDataGridRenderer(
  undefined,
  defaultDataGridClasses,
);

export function createDataGridRenderer(
  options?: DataGridOptions,
  classes?: DataGridClasses,
) {
  const gridClasses =
    mergeObjects(classes, defaultDataGridClasses) ?? defaultDataGridClasses;
  return createDataRenderer(
    (pareProps, renderers) => {
      const {
        control,
        dataContext,
        definition,
        renderChild,
        renderOptions,
        formNode,
        field,
        className,
        readonly,
        required,
        runExpression,
        dataNode,
      } = pareProps;

      const dataGridOptions =
        mergeObjects(
          renderOptions as DataGridOptions & RenderOptions,
          options,
        ) ?? {};
      const headerChild = formNode.getChild(0)!.children;

      const searchField = dataGridOptions.searchField;
      const dataChild = formNode.getChild(1)!;

      return (
        <DataGridControlRenderer
          dataContext={dataContext}
          control={control.as<any[]>()}
          renderOptions={dataGridOptions}
          className={className}
          searchControl={
            searchField
              ? (schemaDataForFieldRef(searchField, dataContext.parentNode)
                  .control as Control<SearchOptions>)
              : undefined
          }
          columns={headerChild}
          rows={dataChild}
          readonly={readonly}
          classes={gridClasses}
          renderAction={renderers.renderAction}
          runExpression={runExpression}
          {...applyArrayLengthRestrictions({
            ...createArrayActions(
              control.as(),
              () => dataChild.getChildCount(),
              field,
              {
                ...dataGridOptions,
                readonly,
              },
            ),
            ...getLengthRestrictions(definition),
            required,
          })}
          renderChild={renderChild}
        />
      );
    },
    {
      renderType: DataGridDefinition.value,
      collection: true,
      schemaExtension: {
        RenderOptions: DataGridDefinition,
        ControlAdornment: DataGridAdornmentDefinition,
        GroupRenderOptions: DataGridGroupDefinition,
      },
      resolveChildren: (c): ChildNodeSpec[] => {
        return [
          {
            childKey: "headers",
            create: () => ({
              definition: groupedControl([]),
              resolveChildren: () => resolveColumns(c, true),
            }),
          },
          {
            childKey: "data",
            create: () => ({
              definition: dataControl("."),
              parent: c.dataNode,
              resolveChildren: (c) =>
                resolveArrayChildren(c.dataNode!, c.form!, (elem) => ({
                  resolveChildren: (c) => resolveColumns(c, false),
                })),
            }),
          },
        ];
      },
    },
  );

  function resolveColumns(
    c: FormStateNode,
    forHeader: boolean,
  ): ChildNodeSpec[] {
    const formNode = c.form!;
    const definition = formNode.definition;
    const extraColumns: ChildNodeSpec[] =
      definition.adornments?.filter(isColumnAdornment).map((x, i) => {
        const def: DataControlDefinition = {
          type: ControlDefinitionType.Data,
          field: ".",
          hideTitle: true,
          renderOptions: x.renderOptions,
          layoutClass: x.layoutClass,
          adornments: [x],
        };
        return {
          childKey: "cc" + i,
          create: (scope, meta) => {
            meta.original = def;
            return {
              definition: forHeader
                ? {
                    ...def,
                    dynamic: x?.visible
                      ? [
                          {
                            type: DynamicPropertyType.Visible,
                            expr: x.visible,
                          },
                        ]
                      : [],
                  }
                : def,
              node: null,
              parent: c.parent,
            };
          },
        };
      }) ?? [];

    const stdColumns: ChildNodeSpec[] = formNode
      .getChildNodes()
      .map((cn, i) => {
        const d = cn.definition;
        return {
          childKey: "c" + i,
          create: (scope, meta) => {
            const colOptions = d.adornments?.find(isColumnAdornment);
            meta.original = d;
            return {
              definition: forHeader
                ? textDisplayControl(d.title!, {
                    dynamic: colOptions?.visible?.type
                      ? [
                          {
                            type: DynamicPropertyType.Visible,
                            expr: colOptions.visible,
                          },
                        ]
                      : [],
                    adornments: colOptions ? [colOptions] : [],
                    title: d.title,
                  })
                : d,
              node: forHeader ? null : cn,
              parent: c.parent,
            } satisfies ChildNodeInit;
          },
        };
      });
    return [...extraColumns, ...stdColumns];
  }
}

interface DataGridRendererProps {
  renderOptions: DataGridOptions;
  rows: FormStateNode;
  columns: FormStateNode[];
  control: Control<any[] | undefined | null>;
  searchControl?: Control<SearchOptions>;
  className?: string;
  renderAction: (action: ActionRendererProps) => ReactNode;
  readonly: boolean;
  addAction?: ActionRendererProps;
  removeAction?: (i: number) => ActionRendererProps;
  editAction?: (i: number) => ActionRendererProps;
  classes: DataGridClasses;
  runExpression: RunExpression;
  renderChild: ChildRenderer;
  dataContext: ControlDataContext;
}

function DataGridControlRenderer({
  renderOptions,
  columns: headerChild,
  searchControl,
  className,
  renderAction,
  readonly,
  addAction,
  removeAction,
  editAction,
  classes,
  rows,
  control,
  renderChild,
  dataContext,
  runExpression,
}: DataGridRendererProps) {
  const { groupByField } = renderOptions;
  useGroupedRows(
    control,
    groupByField ? (t) => t.fields[groupByField as any].value : undefined,
    (n, c) =>
      (ensureMetaValue(c, "groupByRowSpan", () => newControl(n)).value = n),
  );

  const columns: ColumnDefInit<FormStateNode, DataGridColumnExtension>[] =
    headerChild
      .filter((x) => x.visible)
      .map((cn, i) => {
        const d = cn.meta.original as ControlDefinition;
        const colOptions = cn.definition.adornments?.find(isColumnAdornment);
        const headerOptions = getColumnHeaderFromOptions(
          colOptions,
          d,
          classes,
        );

        const rowSpanExpr = colOptions?.rowSpan;

        const isGroupByColumn =
          groupByField &&
          ((isDataControl(d) && groupByField === d.field) ||
            colOptions?.groupedColumn);

        const getRowSpan =
          rowSpanExpr || isGroupByColumn
            ? (row: FormStateNode, index: number) => {
                const rowControl = row.parent.control;
                if (rowSpanExpr) {
                  const cell = row.getChild(i)!;
                  const rs = cell.ensureMeta("rowSpan", () => newControl(1));
                  runExpression(rowControl, rowSpanExpr, (x) => {
                    rs.value = typeof x === "number" ? x : 1;
                  });
                  return rs.value;
                } else {
                  return (
                    getMetaValue<Control<number>>(rowControl, "groupByRowSpan")
                      ?.value ?? 1
                  );
                }
              }
            : undefined;

        return {
          ...headerOptions,
          id: "c" + i,
          title: headerOptions?.title ?? cn.definition.title ?? "Column " + i,
          data: {
            dataContext,
            definition: d,
          },
          getRowSpan,
          render: (row: FormStateNode, rowIndex: number) => {
            if (colOptions?.rowIndex) return rowIndex + 1;
            return renderChild(row.getChild(i)!, {
              displayOnly: renderOptions.displayOnly,
            });
          },
        };
      });

  const allColumns = columnDefinitions<FormStateNode, DataGridColumnExtension>(
    ...columns,
    {
      id: "deleteCheck",
      columnTemplate: "auto",
      render: (r, rowIndex) => (
        <div className={classes.removeColumnClass}>
          {editAction && !readonly && disableActionIfEdit(editAction(rowIndex))}
          {removeAction &&
            !readonly &&
            disableActionIfEdit(removeAction(rowIndex))}
        </div>
      ),
    },
  );

  const rowCount = rows.getChildCount();

  return (
    <>
      <DataGrid
        className={rendererClass(className, classes.className)}
        columns={allColumns}
        bodyRows={rowCount}
        getBodyRow={(i) => rows.getChild(i)!}
        defaultColumnTemplate="1fr"
        cellClass=""
        headerCellClass=""
        bodyCellClass=""
        wrapBodyRow={(rowIndex, render) => {
          const c = rows.getChild(rowIndex)!;
          return (
            <RenderControl key={c.uniqueId}>
              {() => render(c, rowIndex)}
            </RenderControl>
          );
        }}
        renderHeaderContent={renderHeaderContent}
        renderExtraRows={(r) =>
          rowCount === 0 ? (
            <div
              style={{ gridColumn: "1 / -1" }}
              className={classes.noEntriesClass}
            >
              {renderOptions.noEntriesText ?? "No data"}
            </div>
          ) : (
            <></>
          )
        }
      />
      <div className={classes.addContainerClass}>
        {addAction && !readonly && disableActionIfEdit(addAction)}
      </div>
    </>
  );

  function renderHeaderContent(
    col: ColumnDef<FormStateNode, DataGridColumnExtension>,
  ) {
    const { filterField, sortField, title, data } = col;
    let filtered: ReactNode = undefined;
    let sorted: ReactNode = undefined;
    if (data) {
      const {
        dataContext: { schemaInterface, dataNode },
        definition,
      } = data;
      const childPath = fieldPathForDefinition(definition);

      if (dataNode && childPath && searchControl) {
        if (searchControl.current.isNull) searchControl.value = {} as any;
        const { filters, sort, offset } = searchControl.fields;
        if (filterField) {
          filtered = (
            <FilterPopover
              popoverClass={classes.popoverClass}
              schemaInterface={schemaInterface}
              dataNode={dataNode}
              valueNode={schemaForFieldPath(childPath, dataNode.schema)}
              isAnyChecked={() =>
                (filters.value?.[filterField]?.length ?? 0) > 0
              }
              isChecked={(v) =>
                filters.value?.[filterField]?.includes(v) ?? false
              }
              clear={
                !renderOptions.disableClear
                  ? () => (filters.value = {})
                  : undefined
              }
              clearClass={classes.clearFilterClass ?? ""}
              clearText={classes.clearFilterText ?? "Clear"}
              setOption={(v, ch) =>
                groupedChanges(() => {
                  filters.setValue(setFilterValue(filterField, v, ch));
                  offset.value = 0;
                })
              }
            />
          );
        }
        if (sortField) {
          sorted = (
            <SortableHeader
              rotate={() =>
                groupedChanges(() => {
                  sort.setValue(rotateSort(sortField, col.defaultSort));
                  offset.value = 0;
                })
              }
              currentDir={() => findSortField(sort.value, sortField)?.[0]}
            />
          );
        }
      }
    }
    return (
      <div className={classes.titleContainerClass}>
        {title} {filtered} {sorted}
      </div>
    );
  }

  function disableActionIfEdit(action: ActionRendererProps): ReactNode {
    if (!action.disabled && getExternalEditData(control).value !== undefined) {
      return renderAction({ ...action, disabled: true });
    }
    return renderAction(action);
  }
}
