import { NavigationService } from "@astroapps/client";
import Link from "next/link";
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { parse, stringify } from "querystring";
import { AnchorHTMLAttributes, FC, useEffect } from "react";
import { getMatchingRoute, RouteData } from "@astroapps/client";
import { useControl } from "@react-typed-forms/core";
import { useDefaultSyncRoute } from "@astroapps/client";

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
  const paramString = searchParams.toString();
  const query = parse(paramString);
  const queryControl = useControl({ query, isReady: false });
  const pathname = usePathname()!;
  const pathSegments = pathname
    ? pathname.split("/").filter((x) => x.length)
    : [];

  useEffect(() => {
    queryControl.value = { query, isReady: true };
  }, [paramString]);

  useDefaultSyncRoute(queryControl, (query) =>
    router.replace(pathname + "?" + query),
  );
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
