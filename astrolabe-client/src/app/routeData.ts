export type RouteData<A = {}> = {
  label?: string;
  children?: Record<string, RouteData<A>>;
} & A;

export interface BreadcrumbLink {
  label: string;
  href: string;
}

export function getMatchingRoute<A>(
  routes: Record<string, RouteData<A>>,
  segments: string[],
  segmentOffset: number = 0,
): RouteData<A> | undefined {
  while (segmentOffset < segments.length) {
    const seg = segments[segmentOffset];
    const routeKey = Object.keys(routes).find(key => key.toLowerCase() === seg.toLowerCase()) ?? (routes["*"] ? "*" : undefined);
    const definition = routeKey != null ? routes[routeKey] : undefined;
    if (!definition) return undefined;
    if (segmentOffset === segments.length - 1) return definition;
    if (definition.children) {
      routes = definition.children;
      segmentOffset++;
    } else return undefined;
  }
  return routes[""];
}

export function getBreadcrumbs(
  routes: Record<string, RouteData>,
  segments: string[],
  baseHref: string,
  overrideLabels: Record<string, string | undefined>,
  makeHref: (href: string) => string = (x) => x,
): BreadcrumbLink[] {
  if (!segments.length) {
    return [];
  }
  const [seg, ...rest] = segments;
  const definition = routes[seg] ?? routes["*"];
  if (!definition) {
    return [];
  }
  const childCrumbs = definition.children
    ? getBreadcrumbs(
        definition.children,
        rest,
        baseHref + seg + "/",
        overrideLabels,
        makeHref,
      )
    : [];
  if (!definition.label) return childCrumbs;
  const href = makeHref(baseHref + seg);
  return [
    { label: overrideLabels[href] ?? definition.label, href },
    ...childCrumbs,
  ];
}
