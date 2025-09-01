import { HTMLAttributes } from "react";
import {
  DefaultRendererOptions,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { Platform, Pressable, Text, View } from "react-native";
import { RNTextInput } from "./components/RNTextInputRenderer";
import { RNRadioItem } from "./components/RNRadioItem";
import { createRNDateTimePickerRenderer } from "./components/RNDateTimePickerRenderer";
import {
  deepMerge,
  HtmlButtonProperties,
  HtmlComponents,
  HtmlDivProperties,
  HtmlIconProperties,
  HtmlInputProperties,
  IconLibrary,
  RendererRegistration,
} from "@react-typed-forms/schemas";
import { RNHtmlRenderer } from "./components/RNHtmlRenderer";
import { createRNSelectRenderer } from "./components/RNSelectRenderer";
import { StyleProp } from "react-native/Libraries/StyleSheet/StyleSheet";
import { ViewStyle } from "react-native/Libraries/StyleSheet/StyleSheetTypes";
import { Icon } from "./components/Icon";
import {
  createRNCheckboxRenderer,
  RNCheckbox,
} from "./components/RNCheckboxRenderer";
import { createRNTextInputRenderer } from "./components/RNTextInputRenderer";
import {
  createRNScrollListRenderer,
  ExtendedDefaultScrollListOptions,
} from "./components/RNScrollListRenderer";
import { RNCheckButtons } from "./components/RNCheckButtons";

export const reactNativeHtml: HtmlComponents = {
  I: RNIcon,
  B: RNSpan,
  Button: RNButton,
  Label: RNLabel,
  Span: RNSpan,
  H1: RNSpan,
  Div: RNDiv,
  Input: RNInput,
  CheckButtons: RNCheckButtons,
};

export const defaultRnTailwindTheme = deepMerge<DefaultRendererOptions>(
  {
    data: {
      checkOptions: {
        entryClass: "flex flex-row items-center gap-[8px]",
        labelClass: "flex-1",
      },
      selectOptions: { emptyText: "select" },
    },
    label: {
      labelContainer: (c) => (
        <View className="flex flex-row gap-4 items-center" children={c} />
      ),
    },
    array: {
      removableClass: "flex flex-col gap-y-2",
    },
    action: {
      buttonClass:
        "flex flex-row gap-2 bg-primary-500 rounded-lg p-3 web:hover:opacity-90 active:opacity-90",
      textClass: "text-white",
    },
    adornment: {
      accordion: {
        className: "flex flex-row items-center gap-2 my-2 p-0 self-start",
      },
      helpText: {
        iconName: "info-circle",
        iconClass: "text-[12px]",
        triggerContainerClass: "flex flex-row gap-2 items-baseline",
        triggerLabelClass: "text-sm font-bold",
        contentTextClass: "text-white font-semibold text-sm",
      },
    },
    html: reactNativeHtml,
    extraRenderers: (options): RendererRegistration[] => {
      const renderers: RendererRegistration[] = [
        createRNSelectRenderer(options.data?.selectOptions),
        createRNCheckboxRenderer(options.data?.checkOptions),
        createRNTextInputRenderer(
          options.data?.inputClass,
          options.data?.inputTextClass,
        ),
        createRNScrollListRenderer(
          options.data?.scrollListOptions as ExtendedDefaultScrollListOptions,
        ),
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
    <Icon
      name={iconName}
      className={className}
      iconLibrary={iconLibrary as IconLibrary}
    />
  ) : undefined;
}

function RNSpan(props: HTMLAttributes<HTMLElement>) {
  return <Text {...(props as any)} />;
}
function RNButton({
  inline,
  textClass,
  children,
  notWrapInText,
  androidRippleColor,
  nonTextContent,
  onClick,
  ...props
}: HtmlButtonProperties) {
  if (inline) {
    return (
      <Text
        {...(props as any)}
        className={textClass}
        onPress={onClick as any}
        children={children}
      />
    );
  }
  return (
    <Pressable
      {...(props as any)}
      onPress={() => {
        onClick?.();
      }}
      android_ripple={{
        color: androidRippleColor,
      }}
    >
      {notWrapInText || nonTextContent ? (
        children
      ) : (
        <Text className={textClass}>{children}</Text>
      )}
    </Pressable>
  );
}

function RNLabel({
  className,
  html,
  children,
  textClass,
  text,
  style,
  inline,
  ...props
}: HtmlDivProperties) {
  return (
    <View
      className={className}
      style={style as StyleProp<ViewStyle>}
      {...props}
    >
      <Text className={textClass}>{children}</Text>
    </View>
  );
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
          defaultValue={typeof value == "number" ? value.toString() : value}
          onChangeText={(t) => onChangeValue?.(t)}
        />
      );
  }
}
