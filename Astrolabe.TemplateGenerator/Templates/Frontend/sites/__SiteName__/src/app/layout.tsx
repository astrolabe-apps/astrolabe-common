"use client";

import "./globals.css";
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
      <head></head>
      <AppContextProvider value={{ navigation, security }}>
        <body className="h-screen">{children}</body>
      </AppContextProvider>
    </html>
  );
}
