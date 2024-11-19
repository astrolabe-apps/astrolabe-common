import { useCallback, useRef } from "react";

/**
 * Type representing a hook dependency, which can be a string, number, undefined, or null.
 */
export type HookDep = string | number | undefined | null;

/**
 * Interface representing a dynamic hook generator.
 * @template A - The type of the hook result.
 * @template P - The type of the hook context.
 */
export interface DynamicHookGenerator<A, P> {
  deps: HookDep;
  state: any;

  runHook(ctx: P, state: any): A;
}

/**
 * Creates a dynamic hook generator.
 * @template A - The type of the hook result.
 * @template P - The type of the hook context.
 * @template S - The type of the hook state.
 * @param runHook - The function to run the hook.
 * @param state - The initial state of the hook.
 * @param deps - The dependencies of the hook.
 * @returns The dynamic hook generator.
 */
export function makeHook<A, P, S = undefined>(
  runHook: (ctx: P, state: S) => A,
  state: S,
  deps?: HookDep,
): DynamicHookGenerator<A, P> {
  return { deps, state, runHook };
}

/**
 * Type representing the value of a dynamic hook.
 * @template A - The type of the dynamic hook generator.
 */
export type DynamicHookValue<A> =
  A extends DynamicHookGenerator<infer V, any> ? V : never;

/**
 * Converts an array of dependencies to a dependency string.
 * @template A - The type of the dependencies.
 * @param deps - The array of dependencies.
 * @param asHookDep - The function to convert a dependency to a hook dependency.
 * @returns The dependency string.
 */
export function makeHookDepString<A>(
  deps: A[],
  asHookDep: (a: A) => HookDep,
): string {
  return deps.map((x) => toDepString(asHookDep(x))).join(",");
}

/**
 * Custom hook to use dynamic hooks.
 * @template P - The type of the hook context.
 * @template Hooks - The type of the hooks.
 * @param hooks - The hooks to use.
 * @returns A function that takes the hook context and returns the hook values.
 */
export function useDynamicHooks<
  P,
  Hooks extends Record<string, DynamicHookGenerator<any, P>>,
>(
  hooks: Hooks,
): (p: P) => {
  [K in keyof Hooks]: DynamicHookValue<Hooks[K]>;
} {
  const hookEntries = Object.entries(hooks);
  const deps = makeHookDepString(hookEntries, (x) => x[1].deps);
  const ref = useRef<Record<string, any>>({});
  const s = ref.current;
  hookEntries.forEach((x) => (s[x[0]] = x[1].state));
  return useCallback(
    (p: P) => {
      return Object.fromEntries(
        hookEntries.map(([f, hg]) => [f, hg.runHook(p, ref.current[f])]),
      ) as any;
    },
    [deps],
  );
}

/**
 * Converts a value to a dependency string.
 * @param x - The value to convert.
 * @returns The dependency string.
 */
export function toDepString(x: any): string {
  if (x === undefined) return "_";
  if (x === null) return "~";
  return x.toString();
}
