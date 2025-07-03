import { AnchorHTMLAttributes, FC, useContext } from "react";
import { AppContext } from "./index";
import { RouteData } from "../app/routeData";
import { Control } from "@react-typed-forms/core";

export type ParsedUrlQuery = {
  [k: string]: string | string[] | undefined;
};

export type QueryControl = Control<{ query: ParsedUrlQuery; pathname: string, isReady: boolean }>;

export interface NavigationService<T = {}> {
  query: ParsedUrlQuery;
  queryControl: QueryControl;
  get(queryParam: string): string | null;
  getAll(queryParam: string): string[];
  pathSegments: string[];
  pathname: string;
  replace(path: string): void;
  push(path: string): void;
  Link: FC<AnchorHTMLAttributes<HTMLAnchorElement>>;
  route: RouteData<T>;
  pathAndQuery(): string;
}

export interface NavigationServiceContext {
  navigation: NavigationService;
}

export function useNavigationService<T = {}>(): NavigationService<T> {
  const sc = useContext(AppContext).navigation;
  if (!sc) throw "No NavigationService present";
  return sc;
}

export function toParsedQuery(qp: URLSearchParams): ParsedUrlQuery {
  const result: ParsedUrlQuery = {};
  for (const [key, value] of qp.entries()) {
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }
  return result;
}
