import React, { CSSProperties, Fragment, ReactElement } from "react";
import { useControl } from "@react-typed-forms/core";
import clsx from "clsx";
import {
  AccordionAdornment,
  DefaultAccordionRendererOptions,
  FormRenderer,
} from "@react-typed-forms/schemas";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";

export function DefaultAccordion({
  children,
  accordion,
  contentStyle,
  contentClassName,
  designMode,
  iconOpenClass,
  iconClosedClass,
  className,
  renderTitle = (t) => t,
  renderToggler,
  renderers,
  titleClass,
}: {
  children: ReactElement;
  accordion: Partial<AccordionAdornment>;
  contentStyle?: CSSProperties;
  contentClassName?: string;
  designMode?: boolean;
  renderers: FormRenderer;
} & DefaultAccordionRendererOptions) {
  const open = useControl(!!accordion.defaultExpanded);
  const isOpen = open.value;
  const fullContentStyle =
    isOpen || designMode ? contentStyle : { ...contentStyle, display: "none" };
  const title = renderers.renderLabelText(renderTitle(accordion.title, open));
  const toggler = renderToggler ? (
    renderToggler(open, title)
  ) : (
    <Pressable className={className} onPress={() => open.setValue((x) => !x)}>
      <Text className={titleClass}>{title}</Text>
      {/*<i className={clsx(isOpen ? iconOpenClass : iconClosedClass)} />*/}
    </Pressable>
  );

  return (
    <>
      {toggler}
      <View
        style={fullContentStyle as StyleProp<ViewStyle>}
        className={contentClassName}
      >
        {children}
      </View>
    </>
  );
}
