import {
  ChildRenderer,
  ControlDataContext,
  ControlDefinition,
  createGroupRenderer,
  CustomRenderOptions,
  EvalExpressionHook,
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
  { renderType: DataGridGroupDefinition.value },
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
