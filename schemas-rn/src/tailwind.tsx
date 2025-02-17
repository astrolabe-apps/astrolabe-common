// noinspection ES6UnusedImports
import { createElement as h } from "react";

import {
  DefaultRendererOptions,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { createElement, ElementType, ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { RNCheckbox } from "./components/RNCheckbox";
import { RNTextInput } from "./components/RNTextInput";
import { RNText } from "./components/RNText";
import { RNRadioItem } from "./components/RNRadioItem";

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
    case "h1":
      return <RNText {...props} children={children} />;
    case "div":
      // console.log("div", props, children);
      return <View {...props} children={children} />;
    case "input":
      console.log(props);
      const { type, onChange, checked, value, ...rest } = props;
      switch (type) {
        case "datetime-local":
          return <RNText>Date Time input</RNText>;
        case "time":
          return <RNText>Time input</RNText>;
        case "date":
          return <RNText>Time input</RNText>;
        case "radio":
          return (
            <RNRadioItem
              {...rest}
              checked={checked}
              onChange={() => onChange({ target: {} })}
            />
          );
        case "checkbox":
          return (
            <RNCheckbox
              {...rest}
              checked={checked}
              onCheckedChange={(e) => onChange({ target: { checked: e } })}
            />
          );
        default:
          return (
            <RNTextInput
              {...rest}
              value={typeof value == "number" ? value.toString() : value}
              onChangeText={(t) => onChange({ target: { value: t } })}
            />
          );
      }
  }
  throw new Error(`Unknown tag: ${tag}`);
}
