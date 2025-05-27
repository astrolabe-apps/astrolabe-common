import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayRenderOptions,
  boolField,
  buildSchema,
  ControlDataContext,
  ControlDefinition,
  ControlDefinitionType,
  createArrayActions,
  createDataRenderer,
  createOverrideProxy,
  CustomRenderOptions,
  DataControlDefinition,
  DynamicPropertyType,
  fieldPathForDefinition,
  getExternalEditData,
  getLengthRestrictions,
  isDataControl,
  makeParamTag,
  mergeObjects,
  rendererClass,
  RenderOptions,
  RunExpression,
  schemaDataForFieldRef,
  schemaForFieldPath,
  SchemaTags,
  stringField,
} from "@react-typed-forms/schemas";
import {
  ColumnDef,
  ColumnDefInit,
  columnDefinitions,
  DataGrid,
} from "@astroapps/datagrid";
import {
  Control,
  createScopedEffect,
  ensureMetaValue,
  getMetaValue,
  groupedChanges,
  newControl,
  RenderControl,
  useControl,
  useTrackedComponent,
} from "@react-typed-forms/core";
import React, { Fragment, ReactNode } from "react";
import {
  getColumnHeaderFromOptions,
  isColumnAdornment,
} from "./columnAdornment";
import { FilterPopover } from "./FilterPopover";
import {
  findSortField,
  rotateSort,
  SearchOptions,
  setFilterValue,
} from "@astroapps/searchstate";
import { SortableHeader } from "./SortableHeader";
import { useGroupedRows } from "./util";
import { EntityExpression } from "@react-typed-forms/schemas";
import { getCurrentFields } from "@react-typed-forms/core";

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
  evalHidden?: EntityExpression;
  evalRowSpan?: EntityExpression;
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
      const gridClasses =
        mergeObjects(defaultDataGridClasses, classes) ?? defaultDataGridClasses;
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
            field: ".",
            hideTitle: true,
            renderOptions: x.renderOptions,
            layoutClass: x.layoutClass,
          };
          const headerOptions = getColumnHeaderFromOptions(x, def, gridClasses);
          const colNode = formNode.createChildNode(i.toString(), def);
          return {
            ...headerOptions,
            id: "cc" + i,
            render: (_, ri) =>
              x.rowIndex
                ? ri + 1
                : renderChild("c" + i + "_" + ri, colNode, {
                    parentDataNode: dataNode.getChildElement(ri),
                    displayOnly: dataGridOptions.displayOnly,
                  }),
          };
        }) ?? [];
      const columns: ColumnDefInit<Control<any>, DataGridColumnExtension>[] =
        formNode.getChildNodes().map((cn, i) => {
          const d = cn.definition;
          const colOptions = d.adornments?.find(isColumnAdornment);
          const headerOptions = getColumnHeaderFromOptions(
            colOptions,
            d,
            gridClasses,
          );

          return {
            ...headerOptions,
            id: "c" + i,
            title: headerOptions?.title ?? d.title ?? "Column " + i,
            data: {
              dataContext,
              definition: d,
              evalHidden: colOptions?.visible,
              evalRowSpan: colOptions?.rowSpan,
            },
            render: (_: Control<any>, rowIndex: number) =>
              renderChild(i, cn, {
                parentDataNode: dataContext.dataNode!.getChildElement(rowIndex),
                displayOnly: dataGridOptions.displayOnly,
              }),
          };
        });
      const allColumns = constantColumns.concat(columns);

      const searchField = dataGridOptions.searchField;
      return (
        <DynamicGridVisibility
          classes={gridClasses}
          renderOptions={dataGridOptions}
          renderAction={renderers.renderAction}
          control={control.as()}
          runExpression={runExpression}
          searchControl={
            searchField
              ? (schemaDataForFieldRef(searchField, dataContext.parentNode)
                  .control as Control<SearchOptions>)
              : undefined
          }
          columns={allColumns}
          className={className}
          readonly={readonly}
          {...applyArrayLengthRestrictions({
            ...createArrayActions(control.as(), field, {
              ...dataGridOptions,
              readonly,
            }),
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
  const { groupByField } = props.renderOptions;
  useGroupedRows(
    props.control,
    groupByField ? (t) => t.fields[groupByField as any].value : undefined,
    (n, c) =>
      (ensureMetaValue(c, "groupByRowSpan", () => newControl(n)).value = n),
  );
  const overrides = useControl<
    Record<
      number,
      {
        hidden?: boolean;
        getRowSpan?: (c: Control<any>, index: number) => number | undefined;
      }
    >
  >({});

  const newColumns = props.columns.map((x, i) => {
    const colOverrides = overrides.fields[i];
    const { hidden, getRowSpan } = colOverrides.fields;

    createScopedEffect((c) => {
      const data = x.data;
      if (!data) return;
      if (data.evalHidden)
        props.runExpression(c, data.evalHidden, (v) => {
          hidden.value = v === false;
        });

      const rowSpanExpr = data.evalRowSpan;

      const isGroupByColumn =
        groupByField &&
        isDataControl(data.definition) &&
        groupByField === data.definition.field;

      getRowSpan.value =
        rowSpanExpr || isGroupByColumn
          ? (t: Control<any>, index: number) => {
              if (rowSpanExpr) {
                const rs = ensureMetaValue(t, "rowSpan", () => newControl(1));
                const elementContext =
                  data.dataContext.dataNode!.getChildElement(index);
                props.runExpression(t, rowSpanExpr, (x) => {
                  rs.value = typeof x === "number" ? x : 1;
                });
                return rs.value;
              } else {
                return (
                  getMetaValue<Control<number>>(t, "groupByRowSpan")?.value ?? 1
                );
              }
            }
          : undefined;
    }, overrides);

    return createOverrideProxy(x, colOverrides);
  });

  return <DataGridControlRenderer {...props} columns={newColumns} />;
}

interface DataGridRendererProps {
  renderOptions: DataGridOptions;
  columns: ColumnDefInit<Control<any>, DataGridColumnExtension>[];
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
}

function DataGridControlRenderer({
  renderOptions,
  columns,
  control,
  searchControl,
  className,
  renderAction,
  readonly,
  addAction,
  removeAction,
  editAction,
  classes,
}: DataGridRendererProps) {
  const allColumns = columnDefinitions<Control<any>, DataGridColumnExtension>(
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

  const rowCount = control.elements?.length ?? 0;

  function renderHeaderContent(
    col: ColumnDef<Control<any>, DataGridColumnExtension>,
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

  return (
    <>
      <DataGrid
        className={rendererClass(className, classes.className)}
        columns={allColumns}
        bodyRows={rowCount}
        getBodyRow={(i) => control.elements![i]}
        defaultColumnTemplate="1fr"
        cellClass=""
        headerCellClass=""
        bodyCellClass=""
        wrapBodyRow={(rowIndex, render) => {
          const c = control.elements![rowIndex];
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
}
