// noinspection ES6UnusedImports
import { createElement as h } from "react";

import {
  DefaultRendererOptions,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { createElement, ElementType, ReactElement } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { RNCheckbox } from "./components/RNCheckbox";
import { RNTextInput } from "./components/RNTextInput";
import { RNText } from "./components/RNText";
import { RNRadioItem } from "./components/RNRadioItem";
import { createRNDateTimePickerRenderer } from "./components/RNDateTimePickerRenderer";
import { createRNHelpTextRenderer } from "./components/RNHelpTextRenderer";
import { RendererRegistration } from "@react-typed-forms/schemas";
import { RNHtmlRenderer } from "./components/RNHtmlRenderer";
import { FontAwesomeIcon } from "./components/FontAwesomeIcon";
import { createRNSelectRenderer } from "./components/RNSelectRenderer";
import { cn } from "./utils";

export const defaultRnTailwindTheme = {
  ...defaultTailwindTheme,
  array: {
    ...defaultTailwindTheme.array,
    removableClass: "flex flex-col gap-y-2",
    childClass: "bg-surface-100 border p-[10px]",
  },
  action: {
    className:
      "bg-primary-500 rounded-lg p-3 web:hover:opacity-90 active:opacity-90 text-white",
  },
  h: renderHtml,
  renderText: (p, className) => (
    <Text
      className={cn(
        ...(className?.split(" ").filter((x) => x.startsWith("text-")) ?? []),
      )}
    >
      {p}
    </Text>
  ),
  extraRenderers: (options): RendererRegistration[] => {
    const renderers: RendererRegistration[] = [
      createRNHelpTextRenderer(options.adornment?.helpText),
      createRNSelectRenderer(options.data?.selectOptions),
    ];

    if (Platform.OS !== "web") {
      renderers.push(createRNDateTimePickerRenderer(options.data));
    }

    return renderers;
  },
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
    case "i":
      return <FontAwesomeIcon name={props.title} className={props.className} />;
    case "button":
      const onPress = props.onClick;
      return <Pressable {...props} onPress={onPress} children={children} />;
    case "label":
    case "span":
    case "h1":
      return <RNText {...props} children={children} />;
    case "div":
      return props?.dangerouslySetInnerHTML ? (
        <RNHtmlRenderer
          {...props}
          html={props?.dangerouslySetInnerHTML.__html}
        />
      ) : (
        <View {...props} children={children} />
      );
    case "input":
      const { id, type, onChange, checked, value, ...rest } = props;
      switch (type) {
        case "radio":
          return (
            <RNRadioItem
              key={id}
              {...rest}
              checked={checked}
              onChange={() => onChange({ target: {} })}
            />
          );
        case "checkbox":
          return (
            <RNCheckbox
              key={id}
              {...rest}
              checked={checked}
              onCheckedChange={(e) => onChange({ target: { checked: e } })}
            />
          );
        default:
          return (
            <RNTextInput
              key={id}
              {...rest}
              value={typeof value == "number" ? value.toString() : value}
              onChangeText={(t) => onChange({ target: { value: t } })}
            />
          );
      }
  }
  throw new Error(`Unknown tag: ${tag}`);
}
