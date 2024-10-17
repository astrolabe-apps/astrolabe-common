import {
  ClientSideSearching,
  getPageOfResults,
  makeClientSortAndFilter,
  SearchOptions,
} from "@astroapps/searchstate";
import {
  SchemaInterface,
  SchemaNode,
  traverseData,
  traverseSchemaPath,
} from "@react-typed-forms/schemas";
import { useMemo } from "react";
import {
  Control,
  controlValues,
  useComputed,
  useControlEffect,
} from "@react-typed-forms/core";

export function schemaNodeClientSideSearch<T extends {}>(
  schemaNode: SchemaNode,
  schemaInterface: SchemaInterface,
): ClientSideSearching<T> {
  const allNodes = schemaNode.getChildNodes();

  function getSearchText(row: T) {
    return allNodes
      .map((x) =>
        schemaInterface.searchText(
          x.field,
          traverseData([x.field.field], schemaNode, row),
        ),
      )
      .join(" ");
  }

  function getComparison(field: string) {
    const fieldPath = field.split("/");
    return (a: unknown, b: unknown) => {
      const [va, vb, n] = traverseSchemaPath(
        fieldPath,
        schemaNode,
        [a as any, b as any, schemaNode],
        (acc, n) => {
          const f = n.field.field;
          return [acc[0]?.[f] as any, acc[1]?.[f] as any, n];
        },
      );
      return schemaInterface.compareValue(n.field, va, vb);
    };
  }

  function getFilterValue(field: string) {
    return (r: T) => traverseData(field.split("/"), schemaNode, r);
  }

  return { getSearchText, getFilterValue, getComparison };
}

export function useClientSearching<T extends {}>(
  allRows: Control<T[] | undefined | null>,
  pageResults: Control<T[] | undefined | null>,
  request: Control<SearchOptions>,
  schemaNode: SchemaNode,
  schemaInterface: SchemaInterface,
) {
  const clientSideSearch = useMemo(
    () =>
      makeClientSortAndFilter(
        schemaNodeClientSideSearch<T>(schemaNode, schemaInterface),
      ),
    [schemaInterface],
  );

  const { filters, sort, query, offset, length } = request.fields;

  const filterAndSorted = useComputed(() => {
    const v = controlValues({ allResults: allRows, filters, sort, query })();
    if (v.allResults) {
      return clientSideSearch(v, v.allResults);
    }
    return undefined;
  });

  useControlEffect(
    () => [filterAndSorted.value, offset.value, length.value] as const,
    ([res, offset, length]) => {
      if (res) {
        pageResults.value = getPageOfResults(offset, length, res);
      }
    },
    true,
  );
}
