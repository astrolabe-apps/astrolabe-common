import { useControlEffect, useDebounced } from "@react-typed-forms/core";
import { ParsedUrlQuery, QueryControl } from "../service/navigation";
import { useRef } from "react";

/**
 * Watches the queryControl's query field and calls applyQuery whenever it changes.
 * This provides natural batching of query parameter updates since multiple useSyncParam
 * calls all update the same queryControl, triggering a single navigation call.
 *
 * Debouncing prevents excessive re-renders when controls change rapidly (e.g., typing).
 *
 * @param qc The QueryControl to watch
 * @param applyQuery Callback that receives the serialized query string and should update the URL
 * @param debounce Debounce delay in milliseconds (default: 200ms)
 */
export function useDefaultSyncRoute(
  qc: QueryControl,
  applyQuery: (query: string, path: string) => void,
  debounce: number = 200,
) {
  const t = useRef<NodeJS.Timeout | null>(null);
  useControlEffect(
    () => {
      return new URLSearchParams(
        Object.entries(qc.fields.query.value).flatMap(([name, values]) =>
          values
            ? Array.isArray(values)
              ? values.map((v) => [name, v])
              : [[name, values]]
            : [],
        ),
      ).toString();
    },
    (query) => {
      if (t.current) clearTimeout(t.current);
      const wasPath = qc.fields.pathname.current.value;
      t.current = setTimeout(() => applyQuery(query, wasPath), debounce);
    },
  );
}
