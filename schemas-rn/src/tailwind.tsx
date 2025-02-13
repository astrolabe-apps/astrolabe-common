import {
  DefaultRendererOptions,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { createElement, ElementType, ReactElement } from "react";
import { Pressable, Text, View, TextInput } from "react-native";
// noinspection ES6UnusedImports
import { createElement as h } from "react";

export const defaultRnTailwindTheme = {
  ...defaultTailwindTheme,
  h: renderHtml,
  renderText: (p) => <Text>{p}</Text>,
} satisfies DefaultRendererOptions;

function renderHtml(
  tag: ElementType,
  props: any,
  ...childs: any[]
): ReactElement {
  if (typeof tag !== "string") {
    return createElement.apply(null, arguments as any);
  }
  const children = props?.children ?? childs;

  switch (tag) {
    case "button":
      const onPress = props.onClick;
      return <Pressable {...props} onPress={onPress} children={children} />;
    case "label":
    case "span":
      return <Text {...props} children={children} />;
    case "div":
      return <View {...props} children={children} />;
    case "input":
      const { onChange, value, ...rest } = props;
      return (
        <TextInput
          {...rest}
          value={typeof value == "number" ? value.toString() : value}
          onChangeText={(t) => onChange({ target: { value: t } })}
        />
      );
  }
  throw new Error(`Unknown tag: ${tag}`);
}
