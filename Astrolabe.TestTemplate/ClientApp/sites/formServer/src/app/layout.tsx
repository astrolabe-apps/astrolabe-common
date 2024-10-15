"use client";

import "./globals.css";
import "react-quill/dist/quill.snow.css";
import { useNextNavigationService } from "@astroapps/client-nextjs";
import { AppContextProvider } from "@astroapps/client/service";
import { useControlTokenSecurity } from "@astroapps/client/service/security";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigation = useNextNavigationService();
  const security = useControlTokenSecurity();
  return (
    <html lang="en">
      <head>
        <script
          type="text/javascript"
          src="https://api.quickstream.support.qvalent.com/rest/v1/quickstream-api-1.0.min.js"
        ></script>
      </head>
      <AppContextProvider value={{ navigation, security }}>
        <body className="h-screen">{children}</body>
      </AppContextProvider>
    </html>
  );
}
