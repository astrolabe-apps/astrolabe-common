import { useContext } from "react";
import { AppContext } from "./index";
import { Control, newControl, useControl } from "@react-typed-forms/core";

export interface UserState {
  busy: boolean;
  loggedIn: boolean;
  accessToken?: string | null;
}

export interface SecurityService {
  currentUser: Control<UserState>;

  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;

  checkAuthentication(): void;

  login(): Promise<void>;

  logout(): Promise<void>;

  authCallback(): Promise<void>;
}

export interface TokenSecurityService extends SecurityService {
  setToken(accessToken: string): Promise<any>;
}

export interface SecurityServiceContext {
  security: SecurityService;
}

export function useSecurityService(): SecurityService {
  const sc = useContext(AppContext).security;
  if (!sc) throw "No SecurityService present";
  return sc;
}

const guestUserState = newControl<UserState>({ busy: true, loggedIn: false });

export const guestSecurityService: SecurityService = {
  checkAuthentication() {},
  currentUser: guestUserState,
  fetch,
  async logout() {},
  async authCallback() {},
  async login() {},
};

export function createAccessTokenFetcher(
  getToken: () => Promise<string | null | undefined>,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (url, init) => {
    const token = await getToken;
    if (token) {
      const request = new Request(url, init);
      request.headers.set("Authorization", "Bearer " + token);
      return fetch(request);
    }
    return await fetch(url, init);
  };
}

export function useControlTokenSecurity(): TokenSecurityService {
  const user = useControl<UserState>(() => {
    const accessToken = localStorage.getItem("token");
    return {
      busy: false,
      accessToken: accessToken,
      loggedIn: Boolean(accessToken),
    };
  });
  return {
    checkAuthentication() {},
    currentUser: user,
    fetch: createAccessTokenFetcher(
      async () => user.fields.accessToken.current.value,
    ),
    async logout() {},
    async authCallback() {},
    async login() {},
    async setToken(accessToken: string) {
      localStorage.setItem("token", accessToken);
      user.setValue((v) => ({
        ...v,
        loggedIn: true,
        accessToken,
      }));
    },
  };
}
