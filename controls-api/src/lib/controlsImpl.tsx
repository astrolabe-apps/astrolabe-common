"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ControlContext, WriteContext } from "./types";
import type { ControlsRender } from "./react-types";
import { TrackingReadContext, SubscriptionReconciler } from "./readContextImpl";

// ── React Context ───────────────────────────────────────────────────

const ControlContextReact = createContext<ControlContext | null>(null);

export function ControlContextProvider({
  value,
  children,
}: {
  value: ControlContext;
  children: React.ReactNode;
}) {
  return (
    <ControlContextReact.Provider value={value}>
      {children}
    </ControlContextReact.Provider>
  );
}

export function useControlContext(): ControlContext {
  const ctx = useContext(ControlContextReact);
  if (!ctx)
    throw new Error(
      "useControlContext: no ControlContext found. Wrap your app in <ControlContextProvider>.",
    );
  return ctx;
}

// ── controls() wrapper ──────────────────────────────────────────────

interface TrackerRef {
  rc: TrackingReadContext;
  reconciler: SubscriptionReconciler;
}

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
  const renderFn =
    typeof nameOrRender === "function" ? nameOrRender : maybeRender!;
  const displayName =
    typeof nameOrRender === "string"
      ? nameOrRender
      : renderFn.name || "ControlsComponent";

  const Component: React.FC<P> = (props) => {
    const controlContext = useControlContext();
    const [, setRenderCount] = useState(0);

    const trackerRef = useRef<TrackerRef | null>(null);
    if (!trackerRef.current) {
      const rc = new TrackingReadContext();
      const reconciler = new SubscriptionReconciler();
      reconciler.setListener(() => {
        setRenderCount((c) => c + 1);
      });
      trackerRef.current = { rc, reconciler };
    }

    const { rc, reconciler } = trackerRef.current;

    // Reset tracker for this render
    rc.reset();

    const update = (cb: (wc: WriteContext) => void) =>
      controlContext.update(cb);

    // Call the render function
    const result = renderFn(props, { rc, update, controlContext });

    // Reconcile subscriptions (during render, not in effect)
    reconciler.reconcile(rc.tracked);

    // Effect: manage alive/dead lifecycle
    useEffect(() => {
      controlContext.reviveTracker(reconciler);
      return () => {
        controlContext.markTrackerDead(reconciler);
      };
    }, [controlContext, reconciler]);

    return result;
  };

  Component.displayName = displayName;
  return Component;
}
