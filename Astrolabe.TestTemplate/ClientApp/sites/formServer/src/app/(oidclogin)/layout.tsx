"use client";

import { useNextNavigationService } from "@astroapps/client-nextjs";
import { AppContextProvider, PageSecurity, RouteData } from "@astroapps/client";
import { ReactNode } from "react";

const routes: Record<string, RouteData<PageSecurity>> = {
  locallogin: { label: "Login", allowGuests: true },
};

const defaultRoute: RouteData<PageSecurity> = {};

export default function OidcLoginLayout({ children }: { children: ReactNode }) {
  const navigation = useNextNavigationService(routes, defaultRoute);
  return (
    <AppContextProvider value={{ navigation }}>
      {children}
    </AppContextProvider>
  );
}