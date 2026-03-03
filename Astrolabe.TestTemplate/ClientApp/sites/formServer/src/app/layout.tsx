"use client";

import "./globals.css";
import "react-quill-new/dist/quill.snow.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="text/javascript"
          src="https://api.quickstream.support.qvalent.com/rest/v1/quickstream-api-1.0.min.js"
        ></script>
      </head>
      <body className="h-screen">{children}</body>
    </html>
  );
}
