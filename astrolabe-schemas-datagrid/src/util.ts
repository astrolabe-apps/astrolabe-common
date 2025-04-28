import {
  Control,
  groupedChanges,
  updateElements,
  useControlEffect,
} from "@react-typed-forms/core";
import { groupRowsBy } from "@astroapps/datagrid";

export function useGroupedRows<T, K extends string>(
  rows: Control<T[] | null | undefined>,
  getKey: ((t: Control<T>) => K) | undefined,
  applyRowCount: (n: number, control: Control<T>) => void,
) {
  useControlEffect(
    () =>
      getKey
        ? (Object.values(groupRowsBy(rows.elements, getKey)) as Control<T>[][])
        : undefined,
    (groupedRows) => {
      if (groupedRows) {
        groupedChanges(() => {
          groupedRows.forEach((group) =>
            group.forEach((row, i) => {
              applyRowCount(i == 0 ? group.length : 0, row);
            }),
          );
          updateElements(rows, () => groupedRows.flatMap((x) => x));
        });
      }
    },
    true,
  );
}
