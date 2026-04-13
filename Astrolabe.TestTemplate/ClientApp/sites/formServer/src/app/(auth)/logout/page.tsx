"use client";

import { useLogoutPage } from "@astroapps/client-localusers";

export default function LogoutPage() {
  useLogoutPage();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Logging out...</p>
    </div>
  );
}
