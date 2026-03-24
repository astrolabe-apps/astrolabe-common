const objConst = {}.constructor;

export function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null) return a === b;
  if (b == null) return false;
  if (typeof a === "object" && typeof b === "object") {
    if (a.constructor !== b.constructor) return false;
    if (Array.isArray(a)) {
      const ba = b as unknown[];
      if (a.length !== ba.length) return false;
      return a.every((x, i) => deepEquals(x, ba[i]));
    }
    if (a.constructor !== objConst) return false;
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const keys = Object.keys(aObj);
    if (keys.length !== Object.keys(bObj).length) return false;
    return keys.every(
      (k) => Object.prototype.hasOwnProperty.call(bObj, k) && deepEquals(aObj[k], bObj[k]),
    );
  }
  // NaN equality
  return a !== a && b !== b;
}
