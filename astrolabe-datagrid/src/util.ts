export function groupRowsBy<T, K extends string>(
  arr: T[],
  getKey: (t: T) => K,
): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const group = getKey(item);
      acc[group] = acc[group] || [];
      acc[group].push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
