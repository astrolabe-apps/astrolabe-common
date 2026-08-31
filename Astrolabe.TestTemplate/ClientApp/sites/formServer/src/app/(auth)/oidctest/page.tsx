"use client";

import { parseJwt, useSecurityService } from "@astroapps/client";
import { RenderControl, useControl } from "@react-typed-forms/core";
import { ReactNode } from "react";

/**
 * Manual test bench for the Astrolabe.OIDC provider.
 * Mirrors wwwroot/oidctest.html, but drives everything through the
 * SecurityService from @astroapps/client-msal rather than calling MSAL
 * directly, so what is under test is the client stack an app would actually
 * use: SecurityService -> @azure/msal-browser -> the /oidc endpoints.
 */
export default function OidcTestPage() {
  const security = useSecurityService();
  const log = useControl<{ text: string; kind?: "ok" | "err" }[]>([]);

  function say(text: string, kind?: "ok" | "err") {
    log.setValue((l) => [...l, { text, kind }]);
  }

  async function login() {
    say("Starting authorization code + PKCE flow…");
    security.currentUser.fields.afterLoginHref.value = "/oidctest";
    await security.login();
  }

  async function getToken() {
    const before = security.currentUser.fields.accessToken.value;
    say("Requesting an access token…");
    try {
      const token = await security.getAccessToken();
      say(
        token === before
          ? "Got a token — unchanged, MSAL served it from its cache."
          : "Got a new token — MSAL went back to the token endpoint.",
        "ok",
      );
    } catch (e) {
      say(`Token request failed: ${e}`, "err");
    }
  }

  async function logout() {
    say("Logging out — the provider's logout should run…");
    await security.logout();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-8">
      <h1 className="text-xl font-bold">OIDC provider test bench</h1>
      <p className="text-sm text-gray-600">
        Runs against this server&apos;s OIDC provider, federating to the{" "}
        <code>microsoft</code> external provider. Login returns to the home page
        (MSAL uses the configured <code>redirectUri</code>), so come back here
        afterwards to see the result.
      </p>

      <RenderControl
        render={() => {
          const user = security.currentUser.value;
          return (
            <div className="rounded border p-3 text-sm">
              <div>
                busy: <b>{String(user.busy)}</b> · loggedIn:{" "}
                <b>{String(user.loggedIn)}</b>
              </div>
              {user.loggedIn && (
                <div>
                  {user.name}
                  {user.email && ` <${user.email}>`}
                  {!!user.roles?.length && ` · roles: ${user.roles.join(", ")}`}
                </div>
              )}
            </div>
          );
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={login}>1. Login</Button>
        <Button onClick={getToken}>2. Get access token</Button>
        <Button onClick={logout}>3. Logout</Button>
      </div>

      <RenderControl
        render={() => (
          <div className="space-y-1 text-sm">
            {log.value.map((l, i) => (
              <div
                key={i}
                className={
                  l.kind === "ok"
                    ? "text-green-700"
                    : l.kind === "err"
                      ? "text-red-700"
                      : ""
                }
              >
                {l.text}
              </div>
            ))}
          </div>
        )}
      />

      <h2 className="font-semibold">Access token claims</h2>
      <p className="text-sm text-gray-600">
        The provider signs the access token with the same claims as the
        id_token, so <code>idp</code> shows which external provider the session
        came from.
      </p>
      <RenderControl
        render={() => {
          const token = security.currentUser.fields.accessToken.value;
          return (
            <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-xs">
              {token ? JSON.stringify(parseJwt(token), null, 2) : "(none)"}
            </pre>
          );
        }}
      />
    </div>
  );
}

function Button({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
