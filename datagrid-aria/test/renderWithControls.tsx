/**
 * `render`, with the v5 control context above it.
 *
 * `@react-typed-forms/core` v5 has no implicit context and no no-provider
 * fallback: `useControlContext` throws unless a `ControlContextProvider` is
 * mounted above the caller. The harnesses in these tests call
 * `useComponentTracking` by hand — to stay on the same code path the SWC plugin
 * puts real components on — so every render here needs one.
 *
 * Import `render` from this module instead of from `@testing-library/react`.
 * Everything else RTL exports is re-exported unchanged, so the rest of the
 * import list is unaffected.
 */
import * as React from "react";
import {
  render as rtlRender,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import {
  ControlContextProvider,
  getCompatContext,
} from "@react-typed-forms/core";

export * from "@testing-library/react";

/**
 * `@noTrackControls` because the babel/SWC tracking plugin would otherwise
 * inject `useComponentTracking()` at the top of this component — above the
 * provider it renders, which is the very error it exists to prevent.
 */
/** @noTrackControls */
function WithControlContext({ children }: { children?: React.ReactNode }) {
  return (
    <ControlContextProvider value={getCompatContext()}>
      {children}
    </ControlContextProvider>
  );
}

export function render(
  ui: React.ReactNode,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return rtlRender(ui, { ...options, wrapper: WithControlContext });
}
