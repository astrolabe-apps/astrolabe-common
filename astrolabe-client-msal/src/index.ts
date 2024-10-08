import { NavigationService } from "@astroapps/client/service/navigation";
import {
  createAccessTokenFetcher,
  SecurityService,
  UserState,
} from "@astroapps/client/service/security";
import { useControl } from "@react-typed-forms/core";
import { useMsal } from "@azure/msal-react";
import { useEffect } from "react";
import {
  AuthenticationResult,
  PopupRequest,
  RedirectRequest,
  SilentRequest,
} from "@azure/msal-browser";

export type LoginUrlStorage = Pick<
  Storage,
  "setItem" | "getItem" | "removeItem"
>;

export interface MsalServiceOptions {
  popupRequest?: PopupRequest;
  redirectRequest?: RedirectRequest;
  urlStorage?: () => LoginUrlStorage;
  getTokenFromResult?: (result: AuthenticationResult) => string;
  adjustRequest?: (req: Request) => Request;
  defaultAfterLogin?: string;
}

const defaultMsalOptions = {
  urlStorage: () => sessionStorage,
  getTokenFromResult: (r) => r.accessToken,
  defaultAfterLogin: "/",
} satisfies MsalServiceOptions;

export function useMsalSecurityService(
  nav: NavigationService,
  tokenRequest: SilentRequest,
  options?: MsalServiceOptions,
): SecurityService {
  const {
    urlStorage,
    getTokenFromResult,
    adjustRequest,
    popupRequest,
    redirectRequest,
    defaultAfterLogin,
  } = {
    ...defaultMsalOptions,
    ...options,
  };
  const { inProgress, instance: msal, accounts } = useMsal();
  const currentUser = useControl<UserState>({ busy: true, loggedIn: false });
  useEffect(() => {
    if (inProgress === "none") checkInitial();
  }, [inProgress]);
  return {
    currentUser,
    fetch: createAccessTokenFetcher(
      async () =>
        getTokenFromResult(await msal.acquireTokenSilent(tokenRequest)),
      adjustRequest,
    ),
    login,
    logout: async () => {},
  };

  async function login() {
    const afterLogin =
      currentUser.fields.afterLoginHref.value ?? defaultAfterLogin;
    if (popupRequest) {
      const result = await msal.acquireTokenPopup(popupRequest);
      await loginWithToken(result);
      return;
    }
    urlStorage().setItem("afterLogin", afterLogin);
    await msal.acquireTokenRedirect(redirectRequest ?? tokenRequest);
  }

  async function loginWithToken(
    token: AuthenticationResult,
    afterLogin?: string | null,
  ) {
    currentUser.setValue((cu) => ({
      ...cu,
      loggedIn: true,
      busy: false,
      accessToken: getTokenFromResult(token),
    }));
    if (afterLogin) {
      nav.push(afterLogin);
    }
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
      const s = urlStorage();
      const afterLogin = s.getItem("afterLogin");
      if (afterLogin) {
        s.removeItem("afterLogin");
      }
      await loginWithToken(token, afterLogin);
    } catch (e) {
      console.error(e);
    }
  }
}
