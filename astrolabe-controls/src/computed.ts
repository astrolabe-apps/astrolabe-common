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
    const effect = createEffect(compute, (v) => c.setValueImpl(v));
    meta.compute = effect;
    addCleanup(c, () => effect.cleanup());
  } else {
    meta.compute.calculate = compute;
    meta.compute.runEffect();
  }
}
