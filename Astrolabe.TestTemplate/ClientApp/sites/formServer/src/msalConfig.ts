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
  system: {
    loggerOptions: {
      logLevel: LogLevel.Verbose,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
    },
  },
});
