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
      >
        {oidcRequestId && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm text-gray-500">or</div>
            <a
              href={`/oidc/external/login?provider=microsoft&oidc_request_id=${encodeURIComponent(oidcRequestId)}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Login with Microsoft
            </a>
          </div>
        )}
      </LoginForm>
    </div>
  );
}