import { NavigationService } from "@astroapps/client/service/navigation";
import {
  createAccessTokenFetcher,
  SecurityService,
  UserState,
} from "@astroapps/client/service/security";
import { useControl } from "@react-typed-forms/core";
import { useMsal } from "@azure/msal-react";
import { useEffect } from "react";
import { SilentRequest } from "@azure/msal-browser";

export interface MsalServiceOptions {}

const tokenRequest: SilentRequest = {
  scopes: [msalConfig.auth.clientId + "/.default"],
};
export function useMsalSecurityService(
  nav: NavigationService,
): SecurityService {
  const { inProgress, instance: msal, accounts } = useMsal();
  const currentUser = useControl<UserState>({ busy: true, loggedIn: false });
  useEffect(() => {
    if (inProgress === "none") checkInitial();
  }, [inProgress]);
  return {
    currentUser,
    fetch: createAccessTokenFetcher(
      async () => (await msal.acquireTokenSilent(tokenRequest)).accessToken,
    ),
    login,
    logout: async () => {},
  };

  async function login() {
    const afterLogin = currentUser.fields.afterLoginHref.value;
    sessionStorage.setItem("afterLogin", afterLogin ?? "/");
    await msal.acquireTokenRedirect(tokenRequest);
    console.log("Logging in");
  }

  async function checkInitial() {
    const account = msal.getActiveAccount();
    if (!account) {
      if (accounts.length > 0) {
        msal.setActiveAccount(accounts[0]);
      } else {
        currentUser.fields.busy.value = false;
        return;
      }
    }
    try {
      const token = await msal.acquireTokenSilent(tokenRequest);
      const afterLogin = sessionStorage.getItem("afterLogin");
      if (afterLogin) {
        sessionStorage.removeItem("afterLogin");
      }
      currentUser.setValue((cu) => ({
        ...cu,
        loggedIn: true,
        busy: false,
        accessToken: token.accessToken,
      }));
      if (afterLogin) {
        nav.push(afterLogin);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
