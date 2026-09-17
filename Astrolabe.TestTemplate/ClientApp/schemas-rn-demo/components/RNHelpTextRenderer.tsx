import React from "react";
import { Platform, StyleSheet, Text } from "react-native";
import * as TooltipPrimitive from "@rn-primitives/tooltip";
import clsx from "clsx";
import {
  AdornmentPlacement,
  appendMarkupAt,
  ControlAdornmentType,
  createAdornmentRenderer,
  FormRenderer,
  HelpTextAdornment,
} from "@react-typed-forms/schemas";
import {
  DefaultHelpTextRendererOptions,
  Icon,
  RNButton,
} from "@react-typed-forms/schemas-rn";

/**
 * The standard HelpText adornment with an optional label next to the trigger icon.
 */
export interface HelpTextLabel {
  helpLabel?: string | null;
}

export function helpTextAdornment(
  helpText: string,
  helpLabel?: string,
  placement?: AdornmentPlacement,
): HelpTextAdornment & HelpTextLabel {
  return {
    type: ControlAdornmentType.HelpText,
    helpText,
    helpLabel,
    placement,
  };
}

/**
 * Renders a HelpText adornment as a tooltip trigger. By default it's placed at
 * the end of the label, which is what `label.textClassLabelEnd` adds spacing for.
 */
export function createRNHelpTextRenderer(
  options: DefaultHelpTextRendererOptions = {},
) {
  return createAdornmentRenderer(
    (p, renderers) => {
      const adornment = p.adornment as HelpTextAdornment & HelpTextLabel;
      return {
        apply: appendMarkupAt(
          adornment.placement ?? AdornmentPlacement.LabelEnd,
          <HelpTextTooltip
            adornment={adornment}
            renderers={renderers}
            options={options}
          />,
        ),
        priority: 0,
        adornment,
      };
    },
    { adornmentType: ControlAdornmentType.HelpText },
  );
}

function HelpTextTooltip({
  adornment,
  renderers,
  options: {
    triggerContainerClass,
    triggerLabelClass,
    contentContainerClass,
    contentTextClass,
    iconName,
    iconClass,
  },
}: {
  adornment: HelpTextAdornment & HelpTextLabel;
  renderers: FormRenderer;
  options: DefaultHelpTextRendererOptions;
}) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>
        <RNButton
          variant="ghost"
          size="sm"
          className={clsx("h-auto px-2 py-1", triggerContainerClass)}
        >
          {iconName && <Icon name={iconName} className={iconClass} />}
          {adornment.helpLabel && (
            <Text className={triggerLabelClass}>
              {renderers.renderLabelText(adornment.helpLabel)}
            </Text>
          )}
        </RNButton>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Overlay
          style={Platform.OS !== "web" ? StyleSheet.absoluteFill : undefined}
        >
          <TooltipPrimitive.Content
            sideOffset={4}
            className={clsx(
              "z-50 max-w-64 rounded-md bg-gray-900 px-3 py-2 shadow-md",
              contentContainerClass,
            )}
          >
            <Text className={clsx("text-sm text-white", contentTextClass)}>
              {renderers.renderLabelText(adornment.helpText)}
            </Text>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Overlay>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
