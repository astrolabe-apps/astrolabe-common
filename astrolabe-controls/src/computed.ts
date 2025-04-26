import { Control, ControlChange } from "./types";
import {
  ensureInternalMeta,
  getInternalMeta,
  InternalControl,
} from "./internal";
import { createEffect } from "./effect";
import { addCleanup } from "./controlImpl";
import { runTransaction } from "./transactions";

export function updateComputedValue<V>(
  control: Control<V>,
  compute: () => V,
): void {
  const c = control as InternalControl<V>;
  const meta = ensureInternalMeta(c);
  if (meta.compute?.calculate === compute) return;
  if (!meta.compute) {
    const effect = createEffect(compute, (v) => c.setValueImpl(v), c);
    meta.compute = effect;
    c.addCleanup(() => {
      effect.cleanup();
      meta.compute = undefined;
    });
  } else {
    meta.compute.calculate = compute;
    meta.compute.runEffect();
  }
}

export function ensureMetaValue<V>(
  control: Control<any>,
  key: string,
  init: () => V,
): V {
  const meta = ensureInternalMeta(control);
  const v = (meta.values ??= {});
  return ((v[key] as V) ??= init());
}

export function getMetaValue<V>(
  control: Control<any>,
  key: string,
): V | undefined {
  const meta = getInternalMeta(control);
  return meta?.values?.[key] as V;
}

export function clearMetaValue(control: Control<any>, key: string) {
  const meta = getInternalMeta(control);
  if (meta?.values?.[key]) {
    meta.values[key] = undefined;
  }
}
