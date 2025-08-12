import {
  getMatchingRoute,
  NavigationService,
  RouteData,
} from "@astroapps/client";
import Link from "next/link";
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { parse, stringify } from "querystring";
import { AnchorHTMLAttributes, FC } from "react";
import { useControl } from "@react-typed-forms/core";

export function useNextNavigationService<T = {}>(
  routes?: Record<string, RouteData<T>>,
  defaultRoute?: RouteData<T>,
): NavigationService<T> {
  const browser = typeof window !== "undefined";
  const router = useRouter();
  const searchParams = !browser
    ? ({ get: () => null, getAll: () => [], size: 0 } as Pick<
        ReadonlyURLSearchParams,
        "get" | "getAll" | "size"
      >)
    : useSearchParams()!;
  const pathname = usePathname()!;
  const paramString = searchParams.toString();
  const query = parse(paramString);
  const queryControl = useControl({ query, pathname, isReady: false });
  const pathSegments = pathname
    ? pathname.split("/").filter((x) => x.length)
    : [];

  queryControl.value = { query, pathname, isReady: true };

  const route =
    (routes && getMatchingRoute(routes, pathSegments)) ??
    defaultRoute ??
    ({} as RouteData<T>);
  return {
    query,
    queryControl,
    pathSegments,
    pathname,
    ...router,
    get: (p: string) => searchParams.get(p),
    getAll: (p: string) => searchParams.getAll(p),
    Link: Link as FC<AnchorHTMLAttributes<HTMLAnchorElement>>,
    route,
    pathAndQuery: () =>
      pathname + (searchParams.size > 0 ? "?" + stringify(query) : ""),
  } satisfies NavigationService<T>;
}
