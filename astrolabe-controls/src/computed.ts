import { Control, ControlChange } from "./types";
import { getInternalMeta, InternalControl } from "./internal";
import { createEffect } from "./effect";
import { addCleanup } from "./controlImpl";
import { runTransaction } from "./transactions";

export function updateComputedValue<V>(
  control: Control<V>,
  compute: () => V,
  forceValueChange?: boolean,
): void {
  const c = control as InternalControl<V>;
  const meta = getInternalMeta(c) ?? {};
  if (meta.compute?.calculate === compute) return;
  if (!meta.compute) {
    const effect = createEffect(compute, (v) => c.setValueImpl(v));
    meta.compute = effect;
    addCleanup(c, () => effect.cleanup());
    if (forceValueChange) {
      runTransaction(c, () => {
        c._subscriptions?.applyChange(ControlChange.Value);
      });
    }
  } else {
    meta.compute.calculate = compute;
    meta.compute.runEffect();
  }
}
