import { toImpl } from "./controlImpl";
import type { Control } from "./types";

export function lookupControl(
  control: Control<any>,
  path: (string | number)[],
): Control<any> | undefined {
  let base: Control<any> | undefined = control;
  let index = 0;
  while (index < path.length && base) {
    const segment = path[index];
    if (typeof segment === "string") {
      base = base.fields[segment];
    } else {
      base = base.elements[segment];
    }
    index++;
  }
  return base;
}

export function getControlPath(
  control: Control<any>,
  untilParent?: Control<any>,
): (string | number)[] {
  const path: (string | number)[] = [];
  let current = toImpl(control);
  while (current) {
    if (untilParent && current === toImpl(untilParent)) break;
    const parent = current._parents?.[0];
    if (!parent) break;
    path.push(parent.key);
    current = parent.control;
  }
  return path.reverse();
}

export function getElementIndex<V>(
  child: Control<V>,
  parent?: Control<V[]>,
): { index: number; initialIndex: number | undefined } | undefined {
  const impl = toImpl(child);
  const link = parent
    ? impl._parents?.find((x) => x.control === toImpl(parent))
    : impl._parents?.[0];
  return link
    ? { index: link.key as number, initialIndex: link.origKey as number | undefined }
    : undefined;
}