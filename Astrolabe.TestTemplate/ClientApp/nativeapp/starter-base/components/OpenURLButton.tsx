import { useCallback } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { cn } from "~/lib/utils";

export type OpenURLButtonProps = {
  url: string;
  urlText: string;
  title?: string;
  urlUnderline?: boolean;
  containerClasses?: string;
  urlClasses?: string;
};

export function OpenURLButton({
  url,
  urlText,
  title,
  urlUnderline = true,
  containerClasses,
  urlClasses,
}: OpenURLButtonProps) {
  const handlePress = useCallback(async () => {
    try {
      await Linking.openURL(url);
    } catch (e) {}
  }, [url]);

  return (
    <View className={cn("flex flex-row gap-2", containerClasses)}>
      {title && <Text className="color-white">{title}</Text>}
      <Pressable onPress={handlePress}>
        <Text
          className={cn("color-white", urlClasses, urlUnderline && "underline")}
        >
          {urlText}
        </Text>
      </Pressable>
    </View>
  );
}
