import {
  ChildRenderer,
  ControlDataContext,
  ControlDefinition,
  createGroupRenderer,
  CustomRenderOptions,
  FormNode,
  getJsonPath,
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
  ({ renderChild, definition, renderOptions, formNode, dataContext }) => {
    // const allVisibilities = Object.fromEntries(
    //   formNode
    //     .getChildNodes()
    //     .flatMap((cd, i) => [
    //       [i.toString(), useChildVisibility(cd.definition)],
    //       ...(cd
    //         .getChildNodes()
    //         .map(
    //           (cd2, l2) =>
    //             [i + "_" + l2, useChildVisibility(cd2.definition)] as const,
    //         ) ?? []),
    //     ]),
    // );

    return (
      <DataGridGroup
        renderChild={renderChild}
        definition={definition}
        // visibleChildren={allVisibilities}
        dataContext={dataContext}
        formNode={formNode}
      />
    );
  },
  { renderType: DataGridGroupDefinition.value },
);

function DataGridGroup({
  ...props
}: {
  definition: ControlDefinition;
  formNode: FormNode;
  dataContext: ControlDataContext;
  renderChild: ChildRenderer;
}) {
  const Render = useTrackedComponent<{
    definition: ControlDefinition;
    formNode: FormNode;
    dataContext: ControlDataContext;
    renderChild: ChildRenderer;
  }>(({ renderChild, definition, formNode, dataContext }) => {
    // const visibilities = visibilityHooks(dataContext);
    // const visibleRows = useMemo(
    //   () =>
    //     formNode.getChildNodes().map((_, i) => {
    //       let rowCount = 0;
    //       const visibleRows: number[] = [];
    //       let hasKey = false;
    //       do {
    //         const cellKey = `${i}_${rowCount}`;
    //         hasKey = cellKey in visibilities;
    //         if (hasKey && visibilities[cellKey].value) {
    //           visibleRows.push(rowCount);
    //         }
    //         rowCount++;
    //       } while (hasKey);
    //       return visibleRows;
    //     }),
    //   [formNode, visibilities],
    // );
    const maxRows = 1; // visibleRows.reduce((m, x) => Math.max(x.length, m), 0);

    const constantColumns: ColumnDefInit<undefined>[] =
      definition.adornments?.filter(isColumnAdornment).map((x, i) => {
        return {
          ...x,
          id: "cc" + i,
          render: (_, ri) => (x.rowIndex ? ri + 1 : <></>),
        };
      }) ?? [];

    const columns: ColumnDefInit<undefined>[] = formNode
      .getChildNodes()
      .map((cn, i) => {
        const d = cn.definition;
        const colOptions = d.adornments?.find(isColumnAdornment);
        return {
          ...colOptions,
          id: "c" + i,
          title: d.title ?? "Column " + i,
          render: (_, rowIndex: number) => {
            const childIndex = 0;
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
  }, []);
  return <Render {...props} />;
}
