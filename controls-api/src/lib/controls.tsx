"use client";

import React, { useReducer, useRef, useEffect, ReactNode, memo } from "react";
import { ReadContext, TrackingReadContext } from "./readContext";
import { WriteContext, update } from "./writeContext";

export type UpdateFn = (cb: (wc: WriteContext) => void) => void;

export type ControlsRender<P> = (
  props: P & { rc: ReadContext; update: UpdateFn },
) => ReactNode;

/**
 * Wraps a render function with explicit ReadContext/WriteContext injection.
 *
 * Overloads:
 *   controls(renderFn)
 *   controls("Name", renderFn)
 */
export function controls<P extends object>(
  render: ControlsRender<P>,
): React.FC<P>;
export function controls<P extends object>(
  name: string,
  render: ControlsRender<P>,
): React.FC<P>;
export function controls<P extends object>(
  nameOrRender: string | ControlsRender<P>,
  maybeRender?: ControlsRender<P>,
): React.FC<P> {
  const render =
    typeof nameOrRender === "string" ? maybeRender! : nameOrRender;
  const displayName =
    typeof nameOrRender === "string"
      ? nameOrRender
      : nameOrRender.name || undefined;

  const Component = memo(function ControlsComponent(props: P) {
    const [, forceRender] = useReducer((x: number) => x + 1, 0);
    const trackingRef = useRef<TrackingReadContext | null>(null);

    if (!trackingRef.current) {
      trackingRef.current = new TrackingReadContext(forceRender);
    }

    const tracking = trackingRef.current;

    useEffect(() => {
      return () => {
        tracking.cleanup();
      };
    }, [tracking]);

    const result = render({ ...props, rc: tracking, update });
    tracking.update();

    return result;
  });

  if (displayName) {
    Component.displayName = displayName;
  }

  return Component as React.FC<P>;
}
