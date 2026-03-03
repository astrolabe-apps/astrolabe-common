"use client";

import { useLoginPage, LoginFormData } from "@astroapps/client-localusers";
import { LoginForm } from "@astrolabe/ui/user/LoginForm";
import { useRef } from "react";

export default function LocalLoginPage() {
  const oidcRequestId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("oidc_request_id")
      : null;

  const capturedToken = useRef<string | null>(null);

  const runAuthenticate = async (login: LoginFormData) => {
    const resp = await fetch("/api/user/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(login),
    });
    if (!resp.ok) throw resp;
    capturedToken.current = await resp.text();
  };

  const { control, authenticate } = useLoginPage(runAuthenticate);

  async function handleAuthenticate() {
    const success = await authenticate();
    if (success && oidcRequestId && capturedToken.current) {
      const resp = await fetch("/oidc/authorize/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oidcRequestId,
          userToken: capturedToken.current,
        }),
      });
      const { redirectUrl } = await resp.json();
      window.location.href = redirectUrl;
    }
    return success;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm
        control={control}
        authenticate={handleAuthenticate}
        className="w-[600px]"
      />
    </div>
  );
}