import { Control, useFormEdit } from "@react-typed-forms/core";

export interface ControlEditProps {
  disabled: boolean;
  readOnly?: boolean;
}

/**
 * Merge a control's own state with the cascading {@link FormEditState},
 * restriction-only: the context can add a lock but never re-enable what the
 * control itself disabled.
 *
 * @param control
 * @param supportsReadOnly `true` for text-like inputs that honour a native
 *   `readOnly` attribute; `false` for choice inputs (checkbox, switch,
 *   dropdown, ...), where `readonly` degrades to `disabled`.
 */
export function useControlEdit(
  control: Control<unknown>,
  supportsReadOnly: boolean,
): ControlEditProps {
  const { readonly, disabled } = useFormEdit();
  return {
    disabled:
      control.disabled || !!disabled || (!supportsReadOnly && !!readonly),
    readOnly: supportsReadOnly ? !!readonly : undefined,
  };
}
