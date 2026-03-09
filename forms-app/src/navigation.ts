/**
 * Intent-based navigation - the handler performs navigation directly.
 * Works with web routers, React Native navigation, or anything else.
 */
export type NavigationIntent =
  | { type: "viewItem"; itemId: string }
  | { type: "editItem"; itemId: string }
  | { type: "dashboard" }
  | { type: "custom"; data: any };

/**
 * Callback function that handles navigation intents.
 * The consumer implements this to wire up their routing solution.
 */
export type NavigationHandler = (intent: NavigationIntent) => void;
