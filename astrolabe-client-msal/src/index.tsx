import {
  createAccessTokenFetcher,
  SecurityService,
  UserState,
} from "@astroapps/client";
import { useControl } from "@react-typed-forms/core";
import { MsalProvider, useMsal } from "@azure/msal-react";
import React, { FC, ReactNode, useEffect } from "react";
import {
  AuthenticationResult,
  IPublicClientApplication,
  PopupRequest,
  RedirectRequest,
  SilentRequest,
} from "@azure/msal-browser";

export type LoginUrlStorage = Pick<
  Storage,
  "setItem" | "getItem" | "removeItem"
>;

export interface MsalServiceOptions {
  silentRequest?: SilentRequest;
  popupRequest?: PopupRequest;
  redirectRequest?: RedirectRequest;
  urlStorage?: () => LoginUrlStorage;
  getTokenFromResult?: (result: AuthenticationResult) => string;
  adjustRequest?: (req: Request) => Request;
  defaultAfterLogin?: string;
  getUserData?: (
    fetch: SecurityService["fetch"],
  ) => Promise<Partial<UserState>>;
}

const defaultMsalOptions = {
  urlStorage: () => sessionStorage,
  getTokenFromResult: (r) => r.accessToken,
  defaultAfterLogin: "/",
} satisfies MsalServiceOptions;

export function useMsalSecurityService(
  options?: MsalServiceOptions,
): SecurityService {
  const { inProgress, instance: msal, accounts } = useMsal();
  const {
    urlStorage,
    getTokenFromResult,
    adjustRequest,
    popupRequest,
    redirectRequest,
    defaultAfterLogin,
    silentRequest,
    getUserData,
  } = {
    silentRequest: options?.silentRequest ?? {
      scopes: [msal.getConfiguration().auth.clientId + "/.default"],
    },
    ...defaultMsalOptions,
    ...options,
  };
  const currentUser = useControl<UserState>({ busy: true, loggedIn: false });
  useEffect(() => {
    if (inProgress === "none") checkInitial();
  }, [inProgress]);
  return {
    currentUser,
    fetch: createAccessTokenFetcher(
      async () =>
        currentUser.current.fields.busy.value || !msal.getActiveAccount()
          ? null
          : getTokenFromResult(await msal.acquireTokenSilent(silentRequest)),
      adjustRequest,
    ),
    login,
    logout: async () => {
      await msal.logout();
    },
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
    await msal.acquireTokenRedirect(redirectRequest ?? silentRequest);
  }

  async function loginWithToken(token: AuthenticationResult) {
    const accessToken = getTokenFromResult(token);
    const userData = getUserData
      ? await getUserData(
          createAccessTokenFetcher(async () => accessToken, adjustRequest),
        )
      : { roles: [] };
    currentUser.setValue((cu) => ({
      ...cu,
      ...userData,
      loggedIn: true,
      busy: false,
      accessToken,
    }));
  }
  async function checkInitial() {
    const s = urlStorage();
    const afterLogin = s.getItem("afterLogin");
    if (afterLogin) {
      s.removeItem("afterLogin");
      currentUser.fields.afterLoginHref.value = afterLogin;
    }
    const account = msal.getActiveAccount();
    if (!account) {
      if (accounts.length > 0) {
        msal.setActiveAccount(accounts[0]);
      } else {
        currentUser.fields.roles.value = [];
        currentUser.fields.busy.value = false;
        return;
      }
    }
    try {
      const token = await msal.acquireTokenSilent(silentRequest);
      await loginWithToken(token);
    } catch (e) {
      console.error(e);
    }
  }
}

export function wrapWithMsalContext<A extends { children: ReactNode }>(
  Component: FC<A>,
  msalInstance: IPublicClientApplication,
): FC<A> {
  return (props: A) => (
    <MsalProvider instance={msalInstance} children={<Component {...props} />} />
  );
}
