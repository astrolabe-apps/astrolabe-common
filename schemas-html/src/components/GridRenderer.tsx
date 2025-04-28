import {
  createGroupRenderer,
  FormRenderer,
  GridRenderer,
  GroupRendererProps,
  GroupRenderType,
  rendererClass,
} from "@react-typed-forms/schemas";
import { VisibleChildrenRenderer } from "./VisibleChildrenRenderer";
import { ReactNode } from "react";

export interface DefaultGridRenderOptions {
  className?: string;
  defaultColumns?: number;
  rowClass?: string;
}

export function createGridRenderer(options?: DefaultGridRenderOptions) {
  return createGroupRenderer(
    (props, formRenderer) => (
      <VisibleChildrenRenderer
        props={{ ...props, formRenderer, defaultOptions: options }}
        render={renderGrid}
        parent={props}
        dataContext={props.dataContext}
        parentFormNode={props.formNode}
      />
    ),
    {
      renderType: GroupRenderType.Grid,
    },
  );

  function renderGrid(
    props: GroupRendererProps & {
      formRenderer: FormRenderer;
      defaultOptions?: DefaultGridRenderOptions;
    },
    isChildVisible: (i: number) => boolean,
  ) {
    const filteredChildren = props.formNode
      .getChildNodes()
      .filter((x, i) => isChildVisible(i));
    const { Div } = props.formRenderer.html;
    const defaults = props.defaultOptions ?? {};
    const gridOptions = props.renderOptions as GridRenderer;
    const numColumns = gridOptions.columns ?? defaults.defaultColumns ?? 2;
    const allChildren = filteredChildren.map((x, i) => props.renderChild(i, x));

    // split into numColumns items wrapped a div each
    const rows: ReactNode[][] = [];
    for (let i = 0; i < allChildren.length; i += numColumns) {
      rows.push(allChildren.slice(i, i + numColumns));
    }
    return (
      <Div className={rendererClass(props.className, defaults.className)}>
        {rows.map((row, rowIndex) => (
          <Div
            key={rowIndex}
            className={rendererClass(gridOptions.rowClass, defaults.rowClass)}
          >
            {row}
          </Div>
        ))}
      </Div>
    );
  }
}
