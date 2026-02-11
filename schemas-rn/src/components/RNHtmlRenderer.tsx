import RenderHtml, {
  HTMLSource,
  RenderHTMLProps,
} from "react-native-render-html";
import React from "react";
import { Dimensions, StyleProp, View, ViewStyle } from "react-native";

export type RNHtmlRendererProps = {
  className?: string;
  html?: string;
  style?: React.CSSProperties | undefined;
} & Pick<
  RenderHTMLProps,
  "baseStyle" | "tagsStyles" | "systemFonts" | "contentWidth"
>;

export function RNHtmlRenderer({
  className,
  html,
  style,
  contentWidth,
  ...props
}: RNHtmlRendererProps) {
  if (!html) return;
  const source = {
    html: html,
  } satisfies HTMLSource;

  return (
    <View style={style as StyleProp<ViewStyle>} className={className}>
      <RenderHtml
        defaultTextProps={{ selectable: true }}
        contentWidth={contentWidth ?? Dimensions.get("window").width}
        source={source}
        {...props}
      />
    </View>
  );
}
