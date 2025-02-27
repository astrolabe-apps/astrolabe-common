import {
  boolField,
  buildSchema,
  compoundField,
  ControlAdornment,
  ControlDefinition,
  CustomRenderOptions,
  EntityExpression,
  isDataControl,
  makeParamTag,
  rendererClass,
  RenderOptions,
  SchemaTags,
  stringField,
} from "@react-typed-forms/schemas";
import { ColumnHeader, DataGridClasses } from "@astroapps/datagrid";

export type ColumnOptions = Pick<
  ColumnHeader,
  | "cellClass"
  | "headerCellClass"
  | "columnTemplate"
  | "bodyCellClass"
  | "title"
  | "filterField"
  | "sortField"
> & {
  renderOptions?: RenderOptions;
  rowIndex?: boolean;
  layoutClass?: string;
  visible?: EntityExpression;
  rowSpan?: EntityExpression;
  enabledSort?: boolean;
  enabledFilter?: boolean;
};

export function getColumnHeaderFromOptions(
  columnOptions: ColumnOptions | undefined,
  definition: ControlDefinition,
  gridClasses: DataGridClasses,
): Partial<ColumnHeader> {
  if (!columnOptions)
    return {
      cellClass: gridClasses.cellClass,
      headerCellClass: gridClasses.headerCellClass,
      bodyCellClass: gridClasses.bodyCellClass,
    };
  const {
    cellClass,
    headerCellClass,
    columnTemplate,
    bodyCellClass,
    title,
    filterField,
    sortField,
    enabledSort,
    enabledFilter,
  } = columnOptions;
  return {
    cellClass: rendererClass(cellClass, gridClasses.cellClass),
    bodyCellClass: rendererClass(bodyCellClass, gridClasses.bodyCellClass),
    headerCellClass: rendererClass(
      headerCellClass,
      gridClasses.headerCellClass,
    ),
    columnTemplate,
    title,
    filterField: enabledFilter ? customField(filterField) : undefined,
    sortField: enabledSort ? customField(sortField) : undefined,
  };

  function customField(custom: string | undefined) {
    return !custom && isDataControl(definition) ? definition.field : custom;
  }
}

export const ColumnOptionsFields = buildSchema<ColumnOptions>({
  columnTemplate: stringField("Column Template"),
  title: stringField("Title"),
  headerCellClass: stringField("Header Cell Class"),
  bodyCellClass: stringField("Body Cell Class"),
  cellClass: stringField("Cell Class"),
  rowIndex: boolField("Show row index"),
  layoutClass: stringField("Layout Class"),
  renderOptions: compoundField("Render Options", [], {
    schemaRef: "RenderOptions",
    tags: [makeParamTag(SchemaTags.ControlRef, "RenderOptions")],
  }),
  enabledFilter: boolField("Enable filter"),
  enabledSort: boolField("Enable sort"),
  filterField: stringField("Custom filter field"),
  sortField: stringField("Custom sort field"),
  visible: compoundField("Column visibility", [], {
    schemaRef: "EntityExpression",
    tags: [makeParamTag(SchemaTags.ControlRef, "Expression")],
  }),
  rowSpan: compoundField("Row Span", [], {
    schemaRef: "EntityExpression",
    tags: [makeParamTag(SchemaTags.ControlRef, "Expression")],
  }),
});

export const DataGridAdornmentDefinition: CustomRenderOptions = {
  name: "Column Options",
  value: "ColumnOptions",
  fields: ColumnOptionsFields,
};

export function isColumnAdornment(
  c: ControlAdornment,
): c is ColumnOptions & ControlAdornment {
  return c.type === DataGridAdornmentDefinition.value;
}

export function collectColumnClasses(c: ControlDefinition) {
  return (
    c.adornments?.flatMap((x) =>
      isColumnAdornment(x)
        ? [x.cellClass, x.headerCellClass, x.bodyCellClass, x.layoutClass]
        : [],
    ) ?? []
  );
}
