import { Control, getCurrentFields } from "@astroapps/controls";

export function createOverrideProxy<
  A extends object,
  B extends Record<string, any>,
>(proxyFor: A, handlers: Control<B>): A {
  const overrides = getCurrentFields(handlers);
  const allOwn = Reflect.ownKeys(proxyFor);
  Reflect.ownKeys(overrides).forEach((k) => {
    if (!allOwn.includes(k)) allOwn.push(k);
  });
  return new Proxy(proxyFor, {
    get(target: A, p: string | symbol, receiver: any): any {
      if (Object.hasOwn(overrides, p)) {
        const nv = overrides[p as keyof B]!.value;
        if (p === "hidden") {
          console.log("hidden", nv);
        }
        if (nv !== NoOverride) return nv;
      }
      return Reflect.get(target, p, receiver);
    },
    ownKeys(target: A): ArrayLike<string | symbol> {
      console.log(allOwn);
      return allOwn;
    },
    has(target: A, p: string | symbol): boolean {
      return Reflect.has(proxyFor, p) || Reflect.has(overrides, p);
    },
    getOwnPropertyDescriptor(target, k) {
      if (Object.hasOwn(overrides, k))
        return {
          enumerable: true,
          configurable: true,
        };
      return Reflect.getOwnPropertyDescriptor(target, k);
    },
  });
}

class NoValue {}
export const NoOverride = new NoValue();

export type KeysOfUnion<T> = T extends T ? keyof T : never;
