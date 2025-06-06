import { Control } from "./types";
import { InternalControl } from "./internal";
import { newControl } from "./newControl";
import { ObjectLogic } from "./controlLogic";

export function setFields<V, OTHER extends { [p: string]: unknown }>(
  control: Control<V>,
  fields: {
    [K in keyof OTHER]-?: Control<OTHER[K]>;
  },
): Control<V & OTHER> {
  const oc = (
    control as InternalControl<V>
  )._logic.ensureObject() as ObjectLogic;
  oc.setFields({ ...oc._fields, ...fields } as any);
  return control as any;
}

export function getCurrentFields<V extends Record<string, any>>(
  control: Control<V>,
): { [K in keyof V]?: Control<V[K]> } {
  const oc = (
    control as InternalControl<V>
  )._logic.ensureObject() as ObjectLogic;
  return oc._fields as any;
}

export function cloneFields<V extends Record<string, any>>(
  control: Control<V>,
): Control<V> {
  const { initialValue, value } = control.current;
  const nc = newControl(value, undefined, initialValue);
  const nco = (nc as InternalControl<V>)._logic.ensureObject() as ObjectLogic;
  const oc = (
    control as InternalControl<V>
  )._logic.ensureObject() as ObjectLogic;
  nco.setFields(oc._fields);
  return nc;
}
