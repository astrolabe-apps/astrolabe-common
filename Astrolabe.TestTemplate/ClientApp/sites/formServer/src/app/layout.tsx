"use client";

import "./globals.css";
import "react-quill-new/dist/quill.snow.css";
import { ReactNode } from "react";
import {
  ControlContextProvider,
  getCompatContext,
} from "@react-typed-forms/core";

/**
 * `@noTrackControls` because the SWC plugin would otherwise inject
 * `useComponentTracking()` at the top of this component — above the provider it
 * renders — and that call needs the context. Nothing here reads a control, so
 * there is nothing to track anyway.
 *
 * For the same reason no control hook may be added to this component: it would
 * run outside the provider. Put it in a child.
 */
/** @noTrackControls */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="text/javascript"
          src="https://api.quickstream.support.qvalent.com/rest/v1/quickstream-api-1.0.min.js"
        ></script>
      </head>
      <body className="h-screen">
        <ControlContextProvider value={getCompatContext()}>
          {children}
        </ControlContextProvider>
      </body>
    </html>
  );
}
