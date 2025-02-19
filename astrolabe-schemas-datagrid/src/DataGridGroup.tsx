import {
  ChildRenderer,
  ControlDataContext,
  ControlDefinition,
  createGroupRenderer,
  CustomRenderOptions,
  EvalExpressionHook,
  FormNode,
  getJsonPath,
  useDynamicHooks,
} from "@react-typed-forms/schemas";
import { useTrackedComponent } from "@react-typed-forms/core";
import React, { useMemo } from "react";
import {
  ColumnDefInit,
  columnDefinitions,
  DataGrid,
} from "@astroapps/datagrid";
import { isColumnAdornment } from "./columnAdornment";

export const DataGridGroupDefinition: CustomRenderOptions = {
  name: "Data Grid",
  value: "DataGrid",
  fields: [],
};

export const DataGridGroupRenderer = createGroupRenderer(
  ({
    renderChild,
    definition,
    renderOptions,
    childNodes,
    useChildVisibility,
    dataContext,
  }) => {
    const allVisibilities = Object.fromEntries(
      childNodes.flatMap((cd, i) => [
        [i.toString(), useChildVisibility(cd.definition)],
        ...(cd
          .getChildNodes()
          .map(
            (cd2, l2) =>
              [i + "_" + l2, useChildVisibility(cd2.definition)] as const,
          ) ?? []),
      ]),
    );

    return (
      <DataGridGroup
        renderChild={renderChild}
        definition={definition}
        visibleChildren={allVisibilities}
        dataContext={dataContext}
        childNodes={childNodes}
      />
    );
  },
  { renderType: DataGridGroupDefinition.value },
);

function DataGridGroup({
  visibleChildren,
  ...props
}: {
  visibleChildren: Record<string, EvalExpressionHook<boolean>>;
  definition: ControlDefinition;
  childNodes: FormNode[];
  dataContext: ControlDataContext;
  renderChild: ChildRenderer;
}) {
  const visibilityHooks = useDynamicHooks(visibleChildren);
  const Render = useTrackedComponent<{
    definition: ControlDefinition;
    childNodes: FormNode[];
    dataContext: ControlDataContext;
    renderChild: ChildRenderer;
  }>(
    ({ renderChild, definition, childNodes, dataContext }) => {
      const visibilities = visibilityHooks(dataContext);
      const visibleRows = useMemo(
        () =>
          childNodes.map((_, i) => {
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
        [childNodes.length, visibilities],
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

      const columns: ColumnDefInit<undefined>[] = childNodes.map((cn, i) => {
        const d = cn.definition;
        const colOptions = d.adornments?.find(isColumnAdornment);
        return {
          ...colOptions,
          id: "c" + i,
          title: d.title ?? "Column " + i,
          render: (_, rowIndex: number) => {
            const childIndex = visibleRows[i][rowIndex];
            return childIndex == null
              ? ""
              : renderChild(i, cn.getChildNodes()[childIndex]);
          },
        };
      });
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
