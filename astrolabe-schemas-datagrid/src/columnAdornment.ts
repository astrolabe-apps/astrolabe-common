import {
  boolField,
  buildSchema,
  compoundField,
  ControlAdornment,
  ControlDefinition,
  CustomRenderOptions,
  EntityExpression,
  RenderOptions,
  stringField,
} from "@react-typed-forms/schemas";
import { ColumnHeader } from "@astroapps/datagrid";

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
};

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
  }),
  filterField: stringField("Filter field"),
  sortField: stringField("Sort field"),
  visible: compoundField("Visible expression", [], {
    schemaRef: "EntityExpression",
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
        ? [x.cellClass, x.headerCellClass, x.bodyCellClass]
        : [],
    ) ?? []
  );
}
