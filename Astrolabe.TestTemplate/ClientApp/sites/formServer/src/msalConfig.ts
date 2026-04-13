import { LogLevel, PublicClientApplication } from "@azure/msal-browser";

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: "test-spa",
    authority: "https://localhost:5001/oidc",
    protocolMode: "OIDC",
    redirectUri: "https://localhost:5001/",
    postLogoutRedirectUri: "https://localhost:5001/",
    knownAuthorities: ["https://localhost:5001"],
  },
  cache: { cacheLocation: "sessionStorage" },
});
