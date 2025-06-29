import { Control, ControlSetup, ControlValue } from "./types";
import { ControlFlags, InternalControl } from "./internal";
import { ControlImpl, deepEquals } from "./controlImpl";
import {
  ConfiguredControlLogic,
  DefaultControlLogic,
  ObjectLogic,
} from "./controlLogic";

export function newControl<V>(
  value: V,
  setup?: ControlSetup<V, any>,
  initialValue?: V,
): Control<V> {
  return new ControlImpl<V>(
    value,
    arguments.length == 3 ? initialValue! : value,
    setup?.dontClearError ? ControlFlags.DontClearError : ControlFlags.None,
    setup ? new ConfiguredControlLogic(setup) : new DefaultControlLogic(),
  );
}

export function controlGroup<C extends { [k: string]: Control<unknown> }>(
  fields: C,
): Control<{ [K in keyof C]: ControlValue<C[K]> }> {
  const obj = new ObjectLogic(
    deepEquals,
    (f, v, iv, flags) =>
      new ControlImpl(v, iv, flags, new DefaultControlLogic()),
  );
  const newParent = new ControlImpl(
    undefined,
    undefined,
    ControlFlags.None,
    obj,
  );
  obj.setFields(fields as unknown as Record<string, InternalControl>);
  return newParent as unknown as Control<{
    [K in keyof C]: ControlValue<C[K]>;
  }>;
}
