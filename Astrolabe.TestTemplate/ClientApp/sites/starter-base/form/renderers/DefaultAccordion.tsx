import React, { CSSProperties, ReactElement } from "react";
import { useControl } from "@react-typed-forms/core";
import {
  AccordionAdornment,
  DefaultAccordionRendererOptions,
  FormRenderer,
} from "@react-typed-forms/schemas";
import { Pressable, StyleProp, Text, ViewStyle } from "react-native";
import { ChevronDown } from "~/lib/icons/ChevronDown";
import { buttonTextVariants } from "~/components/ui/button";
import {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import Animated from "react-native-reanimated";

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

  const progress = useDerivedValue(() =>
    isOpen
      ? withTiming(1, { duration: 250 })
      : withTiming(0, { duration: 200 }),
  );
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
    opacity: interpolate(progress.value, [0, 1], [1, 0.8], Extrapolation.CLAMP),
  }));

  const toggler = renderToggler ? (
    renderToggler(open, title)
  ) : (
    <Pressable className={className} onPress={() => open.setValue((x) => !x)}>
      <Text className={titleClass}>{title}</Text>
      <Animated.View style={chevronStyle}>
        <ChevronDown
          className={buttonTextVariants({ variant: "outline" })}
          size={18}
        />
      </Animated.View>
      {/*<i className={clsx(isOpen ? iconOpenClass : iconClosedClass)} />*/}
    </Pressable>
  );

  return (
    <>
      {toggler}
      <Animated.View
        entering={FadeIn}
        style={fullContentStyle as StyleProp<ViewStyle>}
        className={contentClassName}
      >
        {children}
      </Animated.View>
    </>
  );
}
