/**
 * @astroapps/controls-react — type spec
 *
 * This file defines the public API for the clean React adapter package.
 * See also: types.ts for the @astroapps/controls core spec.
 */

import type { ReactNode } from "react";
import type { Control, ReadContext, WriteContext, ControlContext } from "./types";

export type UpdateFn = (cb: (wc: WriteContext) => void) => void;
export type UseComputed = <V>(compute: (rc: ReadContext) => V) => Control<V>;

export interface ControlsContext {
  rc: ReadContext;
  update: UpdateFn;
  controlContext: ControlContext;
  useComputed: UseComputed;
}

export type ControlsRender<P> = (
  props: P,
  ctx: ControlsContext,
) => ReactNode;

/**
 * Wraps a render function with explicit ReadContext/WriteContext injection.
 * The ControlContext is obtained from React context (not passed explicitly).
 *
 * Design note: the implementation will:
 * 1. Get ControlContext from React context
 * 2. Create a tracking ReadContext per component instance
 * 3. On each render, call the render function with props and { rc, update }
 * 4. After the function returns, reconcile subscriptions
 * 5. On unmount, cleanup all subscriptions
 * 6. Wrap with React.memo
 *
 * Overloads:
 *   controls(renderFn)
 *   controls("Name", renderFn)
 */
export declare function controls<P extends object>(
  render: ControlsRender<P>,
): React.FC<P>;
export declare function controls<P extends object>(
  name: string,
  render: ControlsRender<P>,
): React.FC<P>;