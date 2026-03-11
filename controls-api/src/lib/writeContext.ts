import {
  Control,
  groupedChanges,
  addElement,
  removeElement,
  updateElements,
} from "@astroapps/controls";

/**
 * WriteContext — explicit write context for batched mutations.
 * Only exists for the duration of an `update()` callback.
 */
export interface WriteContext {
  setValue<V>(control: Control<V>, value: V): void;
  setValueAndInitial<V>(control: Control<V>, value: V, initial: V): void;
  setInitialValue<V>(control: Control<V>, value: V): void;
  markAsClean(control: Control<unknown>): void;

  setTouched(
    control: Control<unknown>,
    touched: boolean,
    notChildren?: boolean,
  ): void;
  setDisabled(
    control: Control<unknown>,
    disabled: boolean,
    notChildren?: boolean,
  ): void;
  setError(
    control: Control<unknown>,
    key: string,
    error?: string | null,
  ): void;
  setErrors(
    control: Control<unknown>,
    errors?: Record<string, string | null | undefined> | null,
  ): void;
  clearErrors(control: Control<unknown>): void;

  addElement<V>(
    control: Control<V[]>,
    child: V,
    index?: number,
  ): Control<V>;
  removeElement<V>(
    control: Control<V[]>,
    child: number | Control<V>,
  ): void;
  updateElements<V>(
    control: Control<V[]>,
    cb: (elems: Control<V>[]) => Control<V>[],
  ): Control<V>[];
}

/** Stateless singleton that delegates to Control methods */
const writeContextImpl: WriteContext = {
  setValue<V>(control: Control<V>, value: V): void {
    control.value = value;
  },
  setValueAndInitial<V>(control: Control<V>, value: V, initial: V): void {
    control.setValueAndInitial(value, initial);
  },
  setInitialValue<V>(control: Control<V>, value: V): void {
    control.setInitialValue(value);
  },
  markAsClean(control: Control<unknown>): void {
    control.markAsClean();
  },
  setTouched(
    control: Control<unknown>,
    touched: boolean,
    notChildren?: boolean,
  ): void {
    control.setTouched(touched, notChildren);
  },
  setDisabled(
    control: Control<unknown>,
    disabled: boolean,
    notChildren?: boolean,
  ): void {
    control.setDisabled(disabled, notChildren);
  },
  setError(
    control: Control<unknown>,
    key: string,
    error?: string | null,
  ): void {
    control.setError(key, error);
  },
  setErrors(
    control: Control<unknown>,
    errors?: Record<string, string | null | undefined> | null,
  ): void {
    control.setErrors(errors);
  },
  clearErrors(control: Control<unknown>): void {
    control.clearErrors();
  },
  addElement<V>(
    control: Control<V[]>,
    child: V,
    index?: number,
  ): Control<V> {
    return addElement(control, child, index);
  },
  removeElement<V>(
    control: Control<V[]>,
    child: number | Control<V>,
  ): void {
    removeElement(control, child);
  },
  updateElements<V>(
    control: Control<V[]>,
    cb: (elems: Control<V>[]) => Control<V>[],
  ): Control<V>[] {
    return updateElements(control, cb);
  },
};

/**
 * Execute a batch of writes. All mutations within the callback are batched;
 * subscribers only run after the callback completes.
 */
export function update(cb: (wc: WriteContext) => void): void {
  groupedChanges(() => cb(writeContextImpl));
}
