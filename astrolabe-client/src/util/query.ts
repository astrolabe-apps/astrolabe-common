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

/**
 * Deeply compares two ParsedUrlQuery objects for equality.
 * Handles string values, string arrays, and undefined values.
 */
export function compareQuery(
  a: Record<string, string | string[] | undefined>,
  b: Record<string, string | string[] | undefined>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  // Different number of keys
  if (keysA.length !== keysB.length) return false;

  // Check each key
  for (const key of keysA) {
    const valA = a[key];
    const valB = b[key];

    // Both undefined or missing
    if (valA === undefined && valB === undefined) continue;

    // One is undefined, other is not
    if (valA === undefined || valB === undefined) return false;

    // Both are arrays
    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (valA.length !== valB.length) return false;
      for (let i = 0; i < valA.length; i++) {
        if (valA[i] !== valB[i]) return false;
      }
      continue;
    }

    // One is array, other is not
    if (Array.isArray(valA) || Array.isArray(valB)) return false;

    // Both are strings
    if (valA !== valB) return false;
  }

  return true;
}
