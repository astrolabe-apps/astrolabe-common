import * as React from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  RNButton,
  RNText,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@react-typed-forms/schemas-rn";

export default function TooltipScreen() {
  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };
  return (
    <View className="flex-1 justify-center items-center p-6">
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <RNButton variant="outline">
            <RNText>{Platform.OS === "web" ? "Hover me" : "Press me"}</RNText>
          </RNButton>
        </TooltipTrigger>
        <TooltipContent insets={contentInsets}>
          <RNText className="native:text-lg">Add to library</RNText>
        </TooltipContent>
      </Tooltip>
    </View>
  );
}
