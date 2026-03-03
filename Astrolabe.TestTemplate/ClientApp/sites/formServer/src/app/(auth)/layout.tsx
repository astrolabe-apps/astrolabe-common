"use client";

import { useNextNavigationService } from "@astroapps/client-nextjs";
import {
  AppContextProvider,
  PageSecurity,
  RouteData,
  usePageSecurity,
} from "@astroapps/client";
import {
  useMsalSecurityService,
  wrapWithMsalContext,
} from "@astroapps/client-msal";
import { msalInstance } from "../../msalConfig";
import { FC, ReactNode } from "react";

const routes: Record<string, RouteData<PageSecurity>> = {
  login: { label: "Login", allowGuests: true, forwardAuthenticated: true },
  signup: {
    label: "Create account",
    allowGuests: true,
    forwardAuthenticated: true,
  },
  logout: { label: "Logout", allowGuests: true },
};

const defaultRoute: RouteData<PageSecurity> = {};

function AppLayout({ children }: { children: ReactNode }) {
  const navigation = useNextNavigationService(routes, defaultRoute);
  const security = useMsalSecurityService();
  return (
    <AppContextProvider value={{ navigation, security }}>
      <PageContent>{children}</PageContent>
    </AppContextProvider>
  );
}

function PageContent({ children }: { children: ReactNode }) {
  const redirecting = usePageSecurity("/login", "/");
  if (redirecting) return null;
  return <>{children}</>;
}

const MsalAppLayout: FC<{ children: ReactNode }> = wrapWithMsalContext(
  AppLayout,
  msalInstance,
);

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <MsalAppLayout>{children}</MsalAppLayout>;
}
