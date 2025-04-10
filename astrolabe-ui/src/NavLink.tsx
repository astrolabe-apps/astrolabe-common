import { HTMLAttributes, ReactNode } from "react";
import { useNavigationService } from "@astroapps/client";
import { RouteData } from "@astroapps/client";
import { PageSecurity } from "@astroapps/client";

export interface NavLink {
	/** The label to display for the link. */
	label?: string;
	/** The path to navigate to when the link is clicked. When passed a function, it fires that function instead. */
	path: string | null | (() => void);

	render?: (props: NavLinkProps) => ReactNode;
	/**
	 * An optional icon
	 */
	icon?: ReactNode;
}

export interface NavLinkProps {
	navLink: NavLink;
	className?: string;
	iconClass?: string;
	labelClass?: string;
	href?: string;
	onClick?: () => void;
}

interface NavListClasses {
	className: string;
	entryClass: string;
	linkClass: string;
	labelClass: string;
	iconClass: string;
}
export interface NavListProps {
	links: NavLink[];
	defaultRenderLink?: (link: NavLinkProps) => ReactNode;
	classes?: Partial<NavListClasses>;
}

export const defaultNavListClasses: NavListClasses = {
	className: "p-4 w-80 space-y-2",
	entryClass: "hover:bg-surface-100 rounded-md p-2",
	iconClass: "text-2xl w-8 text-center",
	labelClass: "hover:underline",
	linkClass: "flex gap-x-4 items-center font-bold",
};

export function NavList({
	links,
	classes,
	defaultRenderLink = (p) => <DefaultNavLink {...p} />,
}: NavListProps) {
	const { className, entryClass, linkClass, labelClass, iconClass } = {
		...defaultNavListClasses,
		...classes,
	};
	return (
		<ul className={className}>
			{links.map((navLink, i) => (
				<li className={entryClass} key={i}>
					{doRender(navLink)}
				</li>
			))}
		</ul>
	);

	function doRender(navLink: NavLink) {
		const { path } = navLink;
		const props = {
			navLink,
			labelClass,
			iconClass,
			className: linkClass,
			href: typeof path === "string" ? path : undefined,
			onClick: typeof path === "function" ? path : undefined,
		};
		return (navLink?.render ?? defaultRenderLink)(props);
	}
}

export function DefaultNavLink({
	navLink: { icon, label },
	labelClass,
	iconClass,
	...linkProps
}: NavLinkProps) {
	const { Link } = useNavigationService();
	return (
		<Link {...linkProps}>
			<span className={iconClass}>{icon}</span>
			<span className={labelClass}>{label}</span>
		</Link>
	);
}

export type NavLinkSpec = string | { list: string; order: number };

export interface NavLinkRouteData {
	navLink?: NavLinkSpec | NavLinkSpec[];
	noLayout?: boolean;
	icon?: ReactNode;
}

export function createNavLinks(
	linkType: string | string[],
	routes: Record<string, RouteData<NavLinkRouteData>>,
	basePath: string = "/",
): NavLink[] {
	const sorted = Object.entries(routes)
		.flatMap((x) => {
			const s = matchingSpec(x[1].navLink);
			return s ? [[x[0], { route: x[1], link: s }] as const] : [];
		})
		.sort((a, b) => specOrder(a[1].link) - specOrder(b[1].link));
	return sorted.map(([path, r]) => ({
		path: basePath + path,
		label: r.route.label,
		icon: r.route.icon,
	}));

	function specOrder(s: NavLinkSpec) {
		return typeof s === "string" ? 0 : s.order;
	}
	function matchingSpec(
		v?: NavLinkSpec | NavLinkSpec[],
	): NavLinkSpec | undefined {
		if (!v) return undefined;
		if (Array.isArray(v)) {
			return v.find(matchOne);
		}
		return matchOne(v) ? v : undefined;
	}

	function matchOne(n: NavLinkSpec): boolean {
		const t = getListForSpec(n);
		return Array.isArray(linkType) ? linkType.includes(t) : t === linkType;
	}
}

export function getListForSpec(n: NavLinkSpec): string {
	return typeof n === "object" ? n.list : n;
}

export function getAllNavLinkLists(nav: NavLinkRouteData) {
	const linkSpecs = nav.navLink;
	if (!linkSpecs) return [];
	return Array.isArray(linkSpecs)
		? linkSpecs.flatMap(getListForSpec)
		: [getListForSpec(linkSpecs)];
}
