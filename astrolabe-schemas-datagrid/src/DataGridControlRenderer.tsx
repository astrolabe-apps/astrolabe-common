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
  CustomRenderOptions,
  DataControlDefinition,
  EvalExpressionHook,
  fieldPathForDefinition,
  getExternalEditData,
  getLengthRestrictions,
  makeHookDepString,
  mergeObjects,
  nodeForControl,
  RenderOptions,
  schemaDataForFieldRef,
  schemaForFieldPath,
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
  getElementIndex,
  groupedChanges,
  RenderControl,
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
}

interface DataGridClasses {
  popoverClass?: string;
  titleContainerClass?: string;
  removeColumnClass?: string;
  addContainerClass?: string;
  noEntriesClass?: string;
}

interface DataGridColumnExtension {
  dataContext: ControlDataContext;
  definition: ControlDefinition;
  evalHidden?: EvalExpressionHook<boolean>;
  evalRowSpan?: EvalExpressionHook<number>;
}

const DataGridFields = buildSchema<DataGridOptions>({
  addText: stringField("Add button text"),
  removeText: stringField("Remove button text"),
  editText: stringField("Edit button text"),
  addActionId: stringField("Add action id"),
  removeActionId: stringField("Remove action id"),
  editActionId: stringField("Edit action id"),
  noEntriesText: stringField("No entries text"),
  noAdd: boolField("No Add"),
  noRemove: boolField("No remove"),
  noReorder: boolField("No reorder"),
  searchField: stringField("Search state field"),
  displayOnly: boolField("Display only"),
  editExternal: boolField("Edit external"),
});
export const DataGridDefinition: CustomRenderOptions = {
  name: "Data Grid",
  value: "DataGrid",
  fields: DataGridFields,
  applies: (sf) => !!sf.field.collection,
};

export const defaultDataGridClasses: DataGridClasses = {
  popoverClass:
    "text-primary-950 animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 rounded-md border bg-white p-4 shadow-md outline-none",
  titleContainerClass: "flex gap-2",
  addContainerClass: "flex justify-center mt-2",
  removeColumnClass: "flex items-center h-full pl-1 gap-2",
  noEntriesClass: "border-t text-center p-3",
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
        useEvalExpression,
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
            field: definition.field,
            hideTitle: true,
            renderOptions: x.renderOptions,
            layoutClass: x.layoutClass,
          };
          const headerOptions = getColumnHeaderFromOptions(x, def);
          const colNode = nodeForControl(def, formNode.tree, "col" + i);
          return {
            ...headerOptions,
            id: "cc" + i,
            render: (_, ri) =>
              x.rowIndex
                ? ri + 1
                : renderChild("c" + i + "_" + ri, colNode, {
                    elementIndex: ri,
                    displayOnly: dataGridOptions.displayOnly,
                  }),
          };
        }) ?? [];
      const columns: ColumnDefInit<Control<any>, DataGridColumnExtension>[] =
        formNode.getChildNodes().map((cn, i) => {
          const d = cn.definition;
          const colOptions = d.adornments?.find(isColumnAdornment);
          const headerOptions = getColumnHeaderFromOptions(colOptions, d);

          return {
            ...headerOptions,
            id: "c" + i,
            title: headerOptions?.title ?? d.title ?? "Column " + i,
            data: {
              dataContext,
              definition: d,
              evalHidden: useEvalExpression(
                colOptions?.visible,
                (x) => !!x,
              ) as EvalExpressionHook<boolean>,
              evalRowSpan: useEvalExpression(
                colOptions?.rowSpan,
                (x) => x,
              ) as EvalExpressionHook<number>,
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
  const depString = makeHookDepString(
    props.columns.map((x) => x.data?.evalHidden),
    (x) => x?.deps,
  );
  console.log(depString);

  const Render = useTrackedComponent<DataGridRendererProps>(
    (props: DataGridRendererProps) => {
      const newColumns = props.columns.map((x) => {
        const data = x.data;
        if (data && (data.evalHidden || data.evalRowSpan)) {
          const visible = data.evalHidden?.runHook(
            data.dataContext,
            data.evalHidden.state,
          );
          const ers = data.evalRowSpan;
          const getRowSpan = ers
            ? (t: Control<any>) => {
                const index = getElementIndex(t);
                console.log(index, data.dataContext);
                return (
                  ers.runHook({ ...data.dataContext }, ers.state)?.value ?? 1
                );
              }
            : undefined;
          return {
            ...x,
            hidden: visible && visible.value === false,
            getRowSpan,
          };
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
  searchControl?: Control<SearchOptions>;
  className?: string;
  renderAction: (action: ActionRendererProps) => ReactNode;
  readonly: boolean;
  addAction?: ActionRendererProps;
  removeAction?: (i: number) => ActionRendererProps;
  editAction?: (i: number) => ActionRendererProps;
  classes: DataGridClasses;
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
        className={className}
        columns={allColumns}
        bodyRows={rowCount}
        getBodyRow={(i) => control.elements![i]}
        defaultColumnTemplate="1fr"
        cellClass=""
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
