import {
  ButtonHTMLAttributes,
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
import { RendererRegistration } from "@react-typed-forms/schemas";
import { RNHtmlRenderer } from "./components/RNHtmlRenderer";
import { FontAwesomeIcon } from "./components/FontAwesomeIcon";
import { createRNSelectRenderer } from "./components/RNSelectRenderer";
import { cn } from "./utils";

export const reactNativeHtml = {
  I: RNIcon,
  B: RNSpan,
  Button: RNButton,
  Label: RNSpan,
  Span: RNSpan,
  H1: RNSpan,
  Div: RNDiv,
  Input: RNInput,
};

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
  html: reactNativeHtml,
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

function RNIcon(props: HTMLAttributes<HTMLElement>) {
  return <FontAwesomeIcon name={props.title!} className={props.className} />;
}

function RNSpan(props: HTMLAttributes<HTMLElement>) {
  return <Text {...(props as any)} />;
}
function RNButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Pressable {...(props as any)} onPress={props.onClick as any} />;
}
function RNDiv(props: HTMLAttributes<HTMLDivElement>) {
  return props?.dangerouslySetInnerHTML ? (
    <RNHtmlRenderer
      {...props}
      html={props?.dangerouslySetInnerHTML.__html as string}
    />
  ) : (
    <View {...(props as any)} />
  );
}
function RNInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { id, type, onChange, checked, value, ...rest } = props;
  switch (type) {
    case "radio":
      return (
        <RNRadioItem
          {...(rest as any)}
          checked={!!checked}
          onChange={() => onChange?.({ target: {} } as any)}
        />
      );
    case "checkbox":
      return (
        <RNCheckbox
          key={id}
          {...(rest as any)}
          checked={!!checked}
          onCheckedChange={(e) => onChange?.({ target: { checked: e } } as any)}
        />
      );
    default:
      return (
        <RNTextInput
          {...(rest as any)}
          value={typeof value == "number" ? value.toString() : value}
          onChangeText={(t) => onChange?.({ target: { value: t } } as any)}
        />
      );
  }
}
