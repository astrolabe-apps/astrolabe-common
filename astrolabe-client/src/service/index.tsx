import React, { createContext, ReactNode } from "react";

export const AppContext = createContext<any>(undefined);

/**
 * A tuple containing a React component and its props, excluding the children prop.
 * @template P The type of the component's props.
 * @type {[React.FC<P>, Omit<P, "children"> | undefined]}
 */
export type AppProvider<P> = [React.FC<P>, Omit<P, "children"> | undefined];

/**
 * A utility function to create a provider for the AppContext.
 * @template P The type of the component's props.
 * @param {React.FC<P>} component The component to be used as the provider.
 * @param {Omit<P, "children">} [props] The props to be passed to the provider component.
 * @returns {AppProvider<P>} A tuple containing the provider component and its props.
 */
export function makeProvider<P extends {}>(
  component: React.FC<P>,
  props?: Omit<P, "children">,
): AppProvider<P> {
  return [component, props];
}

/**
 * A component that provides the AppContext to its children.
 * @template A The type of the value to be provided by the context.
 * @param {Object} props The component props.
 * @param {A} props.value The value to be provided by the context.
 * @param {ReactNode} props.children The children to be wrapped by the provider.
 * @param {AppProvider<any>[]} [props.providers] An array of provider tuples to be applied to the children.
 * @returns {JSX.Element} The component that provides the AppContext to its children.
 */
export function AppContextProvider<A>({
  value,
  children,
  providers,
}: {
  value: A;
  children: ReactNode;
  providers?: AppProvider<any>[];
}) {
  const allChildren =
    providers?.reduce(
      (p, [Provider, props]) => <Provider {...props} children={p} />,
      children,
    ) ?? children;
  return <AppContext.Provider value={value} children={allChildren} />;
}
