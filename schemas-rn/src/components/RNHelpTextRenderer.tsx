﻿import { DefaultHelpTextRendererOptions } from "@react-typed-forms/schemas-html";
import {
  AdornmentPlacement,
  appendMarkupAt,
  ControlAdornment,
  ControlAdornmentType,
  createAdornmentRenderer,
  HelpTextAdornment,
} from "@react-typed-forms/schemas";

import * as TooltipPrimitive from "@rn-primitives/tooltip";
import * as React from "react";
import { Platform, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { cn } from "../utils";
import { RNText, TextClassContext } from "./RNText";
import { RNButton } from "./RNButton";
import { Icon } from "./Icon";

export interface ExtendedHelpText {
  helpLabel: string;
}

export function createRNHelpTextRenderer(
  options: DefaultHelpTextRendererOptions = {},
) {
  const {
    triggerContainerClass,
    triggerLabelClass,
    contentContainerClass,
    contentTextClass,
    iconName,
    iconClass,
  } = options;
  return createAdornmentRenderer(
    (p, renderers) => ({
      apply: appendMarkupAt(
        (p.adornment as HelpTextAdornment).placement ??
          AdornmentPlacement.LabelEnd,
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <RNButton
              variant={"ghost"}
              size={"sm"}
              className={triggerContainerClass}
            >
              {iconName && <Icon name={iconName} className={iconClass} />}
              <RNText className={triggerLabelClass}>
                {renderers.renderLabelText(
                  (p.adornment as ExtendedHelpText & ControlAdornment)
                    .helpLabel,
                )}
              </RNText>
            </RNButton>
          </TooltipTrigger>
          <TooltipContent className={contentContainerClass}>
            <RNText className={contentTextClass}>
              {renderers.renderLabelText(
                (p.adornment as HelpTextAdornment).helpText,
              )}
            </RNText>
          </TooltipContent>
        </Tooltip>,
      ),
      priority: 0,
      adornment: p.adornment,
    }),
    {
      adornmentType: ControlAdornmentType.HelpText,
    },
  );
}

const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  TooltipPrimitive.ContentRef,
  TooltipPrimitive.ContentProps & { portalHost?: string }
>(({ className, sideOffset = 4, portalHost, ...props }, ref) => (
  <TooltipPrimitive.Portal hostName={portalHost}>
    <TooltipPrimitive.Overlay
      style={Platform.OS !== "web" ? StyleSheet.absoluteFill : undefined}
    >
      <Animated.View
        entering={Platform.select({ web: undefined, default: FadeIn })}
        exiting={Platform.select({ web: undefined, default: FadeOut })}
      >
        <TextClassContext.Provider value="text-sm native:text-base text-popover-foreground">
          <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
              "z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 shadow-md shadow-foreground/5 web:animate-in web:fade-in-0 web:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 bg-white",
              className,
            )}
            {...props}
          />
        </TextClassContext.Provider>
      </Animated.View>
    </TooltipPrimitive.Overlay>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
export { Tooltip, TooltipContent, TooltipTrigger };
