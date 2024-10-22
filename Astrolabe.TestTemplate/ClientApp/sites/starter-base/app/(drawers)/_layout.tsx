import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { View } from "react-native";
import { Image } from "expo-image";
import { DrawerToggleButton } from "@react-navigation/drawer";

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          drawerPosition: "right",
          headerLeft: () => (
            <View style={{ paddingLeft: 8 }}>
              <Image
                source={require("~/assets/images/logo-dark.svg")}
                style={{ width: 152, height: 40 }}
              />
            </View>
          ),
          headerRight: () => <DrawerToggleButton />,
        }}
      >
        <Drawer.Screen
          name={"index"}
          options={{ title: "Register a Burn", headerTitle: "" }}
        />
        <Drawer.Screen
          name={"test"}
          options={{ title: "Test", headerTitle: "" }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
