"use client";

import React, { createContext, ReactNode, useContext } from "react";

/**
 * Presentation overrides that cascade to form inputs via React context,
 * independent of a control's own `disabled` flag (which is reserved for
 * business state like "auto-computed" or "not applicable").
 *
 * Inputs combine these with their control state in a restriction-only way:
 * the context can add a lock, never re-enable a field a control disabled.
 */
export interface FormEditState {
  /** Render inputs read-only (value shown, not editable). */
  readonly?: boolean;
  /** Force inputs disabled regardless of control state. */
  disabled?: boolean;
}

const FormEditContext = createContext<FormEditState>({});

/** @noTrackControls */
export function FormEditProvider({
  readonly,
  disabled,
  children,
}: FormEditState & { children: ReactNode }) {
  return (
    <FormEditContext.Provider value={{ readonly, disabled }}>
      {children}
    </FormEditContext.Provider>
  );
}

export function useFormEdit(): FormEditState {
  return useContext(FormEditContext);
}
