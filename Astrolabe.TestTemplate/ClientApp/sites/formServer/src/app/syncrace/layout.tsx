"use client";

import { useNextNavigationService } from "@astroapps/client-nextjs";
import { AppContextProvider } from "@astroapps/client";
import { ReactNode } from "react";

// Repro pages for the useNextNavigationService query sync race. No security,
// so the pages work without signing in.
export default function SyncRaceLayout({ children }: { children: ReactNode }) {
  const navigation = useNextNavigationService();
  return (
    <AppContextProvider value={{ navigation }}>
      <div className="p-4 flex flex-col gap-2">{children}</div>
    </AppContextProvider>
  );
}
