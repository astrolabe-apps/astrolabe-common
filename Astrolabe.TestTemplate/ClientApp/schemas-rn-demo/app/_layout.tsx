import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PortalHost } from "@rn-primitives/portal";
import {
  ControlContextProvider,
  getCompatContext,
} from "@react-typed-forms/core";

/**
 * `@noTrackControls` because the transform plugin would otherwise inject
 * `useComponentTracking()` above the provider this component renders, and that
 * call needs the context. Put any control hooks in a child. Declared separately from
 * `export default` so the annotation attaches to the function itself.
 */
/** @noTrackControls */
function RootLayout() {
  return (
    <ControlContextProvider value={getCompatContext()}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <PortalHost />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ControlContextProvider>
  );
}

export default RootLayout;
