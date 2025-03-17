import {
  ButtonHTMLAttributes,
  ComponentType,
  CSSProperties,
  ForwardedRef,
  forwardRef,
  HTMLAttributes,
  InputHTMLAttributes,
} from "react";

import {
  DefaultRendererOptions,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { Platform, Pressable, Text, View } from "react-native";
import { RNCheckbox } from "./components/RNCheckbox";
import { RNTextInput } from "./components/RNTextInput";
import { RNText } from "./components/RNText";
import { RNRadioItem } from "./components/RNRadioItem";
import { createRNDateTimePickerRenderer } from "./components/RNDateTimePickerRenderer";
import { createRNHelpTextRenderer } from "./components/RNHelpTextRenderer";
import {
  deepMerge,
  fontAwesomeIcon,
  HtmlComponents,
  HtmlDivProperties,
  HtmlIconProperties,
  HtmlInputProperties,
  mergeObjects,
  RendererRegistration,
} from "@react-typed-forms/schemas";
import { RNHtmlRenderer } from "./components/RNHtmlRenderer";
import { FontAwesomeIcon } from "./components/FontAwesomeIcon";
import { createRNSelectRenderer } from "./components/RNSelectRenderer";
import { cn } from "./utils";
import { StyleProp } from "react-native/Libraries/StyleSheet/StyleSheet";
import { ViewStyle } from "react-native/Libraries/StyleSheet/StyleSheetTypes";

export const reactNativeHtml: HtmlComponents = {
  I: RNIcon,
  B: RNSpan,
  Button: RNButton,
  Label: RNSpan,
  Span: RNSpan,
  H1: RNSpan,
  Div: RNDiv,
  Input: RNInput,
};

export const defaultRnTailwindTheme = deepMerge<DefaultRendererOptions>(
  {
    array: {
      removableClass: "flex flex-col gap-y-2",
    },
    action: {
      className:
        "flex flex-row gap-2 bg-primary-500 rounded-lg p-3 web:hover:opacity-90 active:opacity-90",
      textClass: "text-white",
    },
    adornment: {
      accordion: {
        className: "flex flex-row items-center gap-2 my-2 p-0",
      },
    },
    html: reactNativeHtml,
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
  },
  defaultTailwindTheme,
);

function RNIcon({ iconName, className, iconLibrary }: HtmlIconProperties) {
  return iconName ? (
    <FontAwesomeIcon name={iconName} className={className} />
  ) : undefined;
}

function RNSpan(props: HTMLAttributes<HTMLElement>) {
  return <Text {...(props as any)} />;
}
function RNButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Pressable {...(props as any)} onPress={props.onClick as any} />;
}
function RNDiv({
  className,
  html,
  children,
  textClass,
  text,
  style,
  inline,
  ...props
}: HtmlDivProperties) {
  if (html != null) {
    return <RNHtmlRenderer {...props} html={html} />;
  }
  if (inline) {
    return (
      <Text style={style as StyleProp<ViewStyle>} className={textClass}>
        {text ?? children}
      </Text>
    );
  }
  if (text != null) {
    return (
      <View
        className={className}
        style={style as StyleProp<ViewStyle>}
        {...props}
      >
        <Text className={textClass}>{text}</Text>
      </View>
    );
  }
  return (
    <View
      className={className}
      style={style as StyleProp<ViewStyle>}
      children={children}
      {...props}
    />
  );
}

function RNInput(props: HtmlInputProperties) {
  const { id, type, onChangeValue, onChangeChecked, checked, value, ...rest } =
    props;
  switch (type) {
    case "radio":
      return (
        <RNRadioItem
          {...(rest as any)}
          checked={!!checked}
          onChange={() => onChangeChecked?.(!checked)}
        />
      );
    case "checkbox":
      return (
        <RNCheckbox
          key={id}
          {...(rest as any)}
          checked={!!checked}
          onCheckedChange={(e) => onChangeChecked?.(!checked)}
        />
      );
    default:
      return (
        <RNTextInput
          {...(rest as any)}
          value={typeof value == "number" ? value.toString() : value}
          onChangeText={(t) => onChangeValue?.(t)}
        />
      );
  }
}
