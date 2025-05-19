import { useContext, useEffect } from "react";
import { AppContext } from "./index";
import { Control, newControl, useControl } from "@react-typed-forms/core";
import { useNavigationService } from "./navigation";
import { parseJwt } from "../util/jwt";

export interface JwtTokenData {
  name: string;
  email: string;
  oid: string;
  nbf: number;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
  role: string | string[] | undefined;
}

export interface UserState {
  busy: boolean;
  loggedIn: boolean;
  email?: string;
  name?: string;
  accessToken?: string | null;
  afterLoginHref?: string;
  roles?: string[];
  tokenData?: Partial<JwtTokenData>;
}

export interface SecurityService {
  currentUser: Control<UserState>;

  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;

  login(): Promise<void>;

  logout(): Promise<void>;

  baseApiUrl?: string;
}

export interface TokenSecurityService extends SecurityService {
  setToken(accessToken: string): Promise<any>;
}

export interface SecurityServiceContext {
  security: SecurityService;
}

export function useSecurityService<
  T extends SecurityService = SecurityService,
>(): T {
  const sc = useContext(AppContext).security;
  if (!sc) throw "No SecurityService present";
  return sc;
}

const guestUserState = newControl<UserState>({ busy: true, loggedIn: false });

export const guestSecurityService: SecurityService = {
  currentUser: guestUserState,
  fetch: typeof window === "undefined" ? fetch : window.fetch.bind(window),
  async logout() {},
  async login() {},
};

export function createAccessTokenFetcher(
  getToken: () => Promise<string | null | undefined>,
  adjustRequest?: (req: Request) => Request,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (url, init) => {
    const token = await getToken();
    if (token || adjustRequest) {
      const request = new Request(url, init);
      if (token) request.headers.set("Authorization", "Bearer " + token);
      adjustRequest?.(request);
      return fetch(request);
    }
    return await fetch(url, init);
  };
}

export function useControlTokenSecurity(options?: {
  getUserData?: (
    fetch: SecurityService["fetch"],
  ) => Promise<Partial<UserState>>;
}): TokenSecurityService {
  const tokens = getTokenStorage();
  const user = useControl<UserState>({
    busy: true,
    accessToken: null,
    loggedIn: false,
  });
  useEffect(() => {
    checkInitial();
  }, []);
  return {
    currentUser: user,
    fetch: createAccessTokenFetcher(
      async () => user.fields.accessToken.current.value,
    ),
    async logout() {
      tokens.removeItem("token");
      user.value = { busy: false, accessToken: null, loggedIn: false };
    },
    async login() {},
    async setToken(accessToken: string) {
      await setupUserFromToken(accessToken);
    },
  };

  async function checkInitial() {
    const accessToken = tokens.getItem("token");
    const userData =
      accessToken && options?.getUserData
        ? await options.getUserData(
            createAccessTokenFetcher(async () => accessToken),
          )
        : undefined;

    user.value = {
      ...userStateFromToken(accessToken),
      ...userData,
      busy: false,
    };
  }

  async function setupUserFromToken(accessToken: string) {
    tokens.setItem("token", accessToken);
    const userData = {
      ...userStateFromToken(accessToken),
      ...(options?.getUserData
        ? await options.getUserData(
            createAccessTokenFetcher(async () => accessToken),
          )
        : undefined),
    };
    user.setValue((cu) => ({ ...cu, ...userData }));
  }
}

export function userStateFromToken(jwtToken: string | null): {
  loggedIn: boolean;
  accessToken: string | null;
  roles: string[];
  name?: string;
  tokenData: Partial<JwtTokenData> | undefined;
  email?: string;
} {
  if (!jwtToken)
    return {
      loggedIn: false,
      accessToken: null,
      roles: [],
      tokenData: undefined,
      name: undefined,
      email: undefined,
    };
  const jwt = parseJwt(jwtToken) as Partial<JwtTokenData>;
  return {
    loggedIn: true,
    accessToken: jwtToken,
    roles: Array.isArray(jwt.role) ? jwt.role : jwt.role ? [jwt.role] : [],
    name: jwt.name,
    email: jwt.email,
    tokenData: jwt as any,
  };
}

function getTokenStorage(): Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
> {
  if (typeof sessionStorage === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem() {},
    };
  }
  return sessionStorage;
}

export interface PageSecurity {
  allowGuests?: boolean;
  forwardAuthenticated?: boolean;
  dontWaitForAuth?: boolean;
}

export function usePageSecurity(
  loginHref: string = "/login",
  defaultHref: string = "/",
  logoutHref: string = "/logout",
): boolean {
  const security = useSecurityService();
  const nav = useNavigationService<PageSecurity>();
  const route = nav.route;
  const fields = security.currentUser.fields;
  const busy = fields.busy.value && !route.dontWaitForAuth;
  const loggedIn = fields.loggedIn.value;
  const forwardLogin = !busy && !loggedIn && !route.allowGuests;
  const forwardAuth = !busy && loggedIn && route.forwardAuthenticated;

  useEffect(() => {
    if (forwardLogin) {
      fields.afterLoginHref.value =
        nav.pathname !== logoutHref ? nav.pathAndQuery() : undefined;
      nav.push(loginHref);
    }
  }, [forwardLogin]);
  useEffect(() => {
    if (forwardAuth) {
      nav.replace(fields.afterLoginHref.value ?? defaultHref);
      fields.afterLoginHref.value = undefined;
    }
  }, [forwardAuth]);
  return busy || forwardAuth || forwardLogin;
}
