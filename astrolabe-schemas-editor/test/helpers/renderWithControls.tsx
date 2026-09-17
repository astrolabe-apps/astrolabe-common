/**
 * `render`/`renderHook`, with the v5 control context above them.
 *
 * `@react-typed-forms/core` v5 has no implicit context and no no-provider
 * fallback: `useControlContext` throws unless a `ControlContextProvider` is
 * mounted above the caller, and the editor hooks under test create controls.
 *
 * Import from this module instead of from `@testing-library/react`. Everything
 * else RTL exports is re-exported unchanged, so the rest of the import list is
 * unaffected.
 */
import * as React from 'react';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderHookOptions,
  type RenderHookResult,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import {
  ControlContextProvider,
  getCompatContext,
} from '@react-typed-forms/core';

export * from '@testing-library/react';

/**
 * `@noTrackControls` because the control-tracking plugin would otherwise inject
 * `useComponentTracking()` at the top of this component — above the provider it
 * renders, which is the very error it exists to prevent.
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
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return rtlRender(ui, { ...options, wrapper: WithControlContext });
}

export function renderHook<Result, Props>(
  hook: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>,
): RenderHookResult<Result, Props> {
  return rtlRenderHook(hook, { ...options, wrapper: WithControlContext });
}
