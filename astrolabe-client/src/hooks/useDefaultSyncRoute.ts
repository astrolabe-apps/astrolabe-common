import { useControlEffect, useDebounced } from "@react-typed-forms/core";
import { ParsedUrlQuery, QueryControl } from "../service/navigation";

export function useDefaultSyncRoute(
  qc: QueryControl,
  applyQuery: (query: string) => void,
  debounce: number = 200,
) {
  useControlEffect(
    () => qc.fields.query.value,
    useDebounced(updateRoute, debounce),
  );
  function updateRoute(params: ParsedUrlQuery) {
    applyQuery(
      new URLSearchParams(
        Object.entries(params).flatMap(([name, values]) =>
          values
            ? Array.isArray(values)
              ? values.map((v) => [name, v])
              : [[name, values]]
            : [],
        ),
      ).toString(),
    );
  }
}
