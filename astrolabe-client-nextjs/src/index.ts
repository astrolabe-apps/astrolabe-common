import {
  getMatchingRoute,
  NavigationService,
  RouteData,
  useDefaultSyncRoute,
  compareQuery,
} from "@astroapps/client";
import Link from "next/link";
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { parse, stringify } from "querystring";
import { AnchorHTMLAttributes, FC, useRef } from "react";
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

  // Track the query string we're setting to distinguish genuine changes from stale renders
  const queryRef = useRef<string | null>(null);

  // Only update queryControl if searchParams has genuinely changed (not just a stale render during debounce)
  if (queryRef.current !== paramString) {
    queryControl.value = { query, pathname, isReady: true };
  }

  // Update queryControl if the path differs from current state
  const updateQueryControl = (path: string) => {
    // Handle query-only paths (e.g., "?foo=bar")
    const isQueryOnly = path.startsWith("?");
    const [newPathname, queryString] = isQueryOnly
      ? [queryControl.value.pathname, path.substring(1)]
      : path.split("?");
    const newQuery = parse(queryString || "");

    // Track the query string we're setting for comparison on next render
    queryRef.current = queryString || null;

    const current = queryControl.value;
    if (
      current.pathname !== newPathname ||
      !compareQuery(current.query, newQuery)
    ) {
      queryControl.value = {
        query: newQuery,
        pathname: newPathname,
        isReady: true,
      };
    }
  };

  // Wrap replace to intercept navigation and keep queryControl synchronized
  const wrappedReplace = (path: string, opts?: { scroll?: boolean }) => {
    updateQueryControl(path);
    router.replace(path, opts);
  };

  // Wrap push to intercept navigation and keep queryControl synchronized
  const wrappedPush = (path: string, opts?: { scroll?: boolean }) => {
    updateQueryControl(path);
    router.push(path, opts);
  };

  // Watch queryControl for changes from useSyncParam and batch URL updates
  // Only update query string, preserve the current pathname
  useDefaultSyncRoute(queryControl, (query, path) => {
    if (
      path !== queryControl.fields.pathname.current.value ||
      queryRef.current === query
    )
      return;
    router.replace(path + "?" + query, {
      scroll: false,
    });
  });

  const route =
    (routes && getMatchingRoute(routes, pathSegments)) ??
    defaultRoute ??
    ({} as RouteData<T>);
  return {
    query,
    queryControl,
    pathSegments,
    pathname,
    replace: wrappedReplace,
    push: wrappedPush,
    get: (p: string) => searchParams.get(p),
    getAll: (p: string) => searchParams.getAll(p),
    Link: Link as FC<AnchorHTMLAttributes<HTMLAnchorElement>>,
    route,
    pathAndQuery: () =>
      pathname + (searchParams.size > 0 ? "?" + stringify(query) : ""),
  } satisfies NavigationService<T>;
}
