"use client";

import "./globals.css";
import "react-quill-new/dist/quill.snow.css";
import { useNextNavigationService } from "@astroapps/client-nextjs";
import { AppContextProvider } from "@astroapps/client";
import { useControlTokenSecurity } from "@astroapps/client";

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
        <link
          rel="stylesheet"
          href="https://kit.fontawesome.com/95cc77b353.css"
          crossOrigin="anonymous"
        />
      </head>
      <AppContextProvider value={{ navigation, security }}>
        <body className="h-screen">{children}</body>
      </AppContextProvider>
    </html>
  );
}
