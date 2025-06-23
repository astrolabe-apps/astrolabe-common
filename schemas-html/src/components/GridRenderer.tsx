import {
  createGroupRenderer,
  FormRenderer,
  GridRendererOptions,
  GroupRendererProps,
  GroupRenderType,
  rendererClass,
} from "@react-typed-forms/schemas";
import { ReactNode } from "react";

export interface DefaultGridRenderOptions {
  className?: string;
  defaultColumns?: number;
  rowClass?: string;
  cellClass?: string;
}

export function createGridRenderer(options?: DefaultGridRenderOptions) {
  return createGroupRenderer(
    (props, formRenderer) => (
      <GridRenderer
        groupProps={props}
        formRenderer={formRenderer}
        options={options}
      />
    ),
    {
      renderType: GroupRenderType.Grid,
    },
  );
}

function GridRenderer(props: {
  groupProps: GroupRendererProps;
  formRenderer: FormRenderer;
  options?: DefaultGridRenderOptions;
}) {
  const { formNode, renderOptions, renderChild, className } = props.groupProps;
  const filteredChildren = formNode.children.filter((x, i) => x.visible);
  const { Div } = props.formRenderer.html;
  const defaults = props.options ?? {};
  const gridOptions = renderOptions as GridRendererOptions;
  const numColumns = gridOptions.columns ?? defaults.defaultColumns ?? 2;
  const allChildren = filteredChildren.map((x) => renderChild(x));

  // split into numColumns items wrapped a div each
  const rows: ReactNode[][] = [];
  for (let i = 0; i < allChildren.length; i += numColumns) {
    rows.push(allChildren.slice(i, i + numColumns));
  }
  return (
    <Div className={rendererClass(className, defaults.className)}>
      {rows.map((row, rowIndex) => (
        <Div
          key={rowIndex}
          className={rendererClass(gridOptions.rowClass, defaults.rowClass)}
        >
          {row.map((cell, cellIndex) => (
            <Div key={cellIndex} className={rendererClass(defaults.cellClass)}>
              {cell}
            </Div>
          ))}
        </Div>
      ))}
    </Div>
  );
}
