export function queryToString(
  queryParams: Record<string, string | string[] | undefined>,
): string {
  return new URLSearchParams(
    Object.entries(queryParams).flatMap(([name, values]) =>
      values
        ? Array.isArray(values)
          ? values.map((v) => [name, v])
          : [[name, values]]
        : [],
    ),
  ).toString();
}
