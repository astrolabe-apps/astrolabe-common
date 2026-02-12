import { HtmlDivProperties } from "@react-typed-forms/schemas";
import React from "react";
import { RNHtmlRenderer } from "./components/RNHtmlRenderer";
import { Role, StyleProp, Text, View, ViewStyle } from "react-native";

export function RNDiv({
  className,
  html,
  children,
  textClass,
  text,
  style,
  inline,
  role,
  selectable,
  ...props
}: HtmlDivProperties & { selectable?: boolean }) {
  if (html != null) {
    return <RNHtmlRenderer {...props} html={html} noSelection={!selectable} />;
  }
  if (inline) {
    return (
      <Text
        style={style as StyleProp<ViewStyle>}
        className={textClass}
        selectable={selectable}
      >
        {text ?? children}
      </Text>
    );
  }
  if (text != null) {
    return (
      <View
        className={className}
        style={style as StyleProp<ViewStyle>}
        role={role as Role}
        {...props}
      >
        <Text className={textClass} selectable={selectable}>
          {text}
        </Text>
      </View>
    );
  }
  return (
    <View
      className={className}
      style={style as StyleProp<ViewStyle>}
      children={children}
      role={role as Role}
      {...props}
    />
  );
}
