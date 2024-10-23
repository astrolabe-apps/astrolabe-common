import { Linking, Pressable, View } from "react-native";
import React, { useCallback } from "react";

export type SocialMediaButtonProps = {
  url: string;
  icon: React.JSX.Element;
};

export function SocialMediaButton({ url, icon }: SocialMediaButtonProps) {
  const handlePress = useCallback(async () => {
    try {
      await Linking.openURL(url);
    } catch (e) {}
  }, [url]);

  return (
    <View className={"flex flex-row shrink"}>
      <Pressable onPress={handlePress}>{icon}</Pressable>
    </View>
  );
}
