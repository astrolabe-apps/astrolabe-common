import RenderHtml, { HTMLSource } from "react-native-render-html";
import React from "react";
import { Dimensions, View } from "react-native";

export type RNHtmlRendererProps = {
  className?: string;
  html?: string;
};
export function RNHtmlRenderer({ className, html }: RNHtmlRendererProps) {
  if (!html) return;
  const source = {
    html: html,
  } satisfies HTMLSource;

  return (
    <View className={className}>
      <RenderHtml
        contentWidth={Dimensions.get("window").width}
        source={source}
      />
    </View>
  );
}
