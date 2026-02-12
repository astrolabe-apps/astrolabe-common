import React, { Fragment } from "react";
import {
  ActionRendererProps,
  ActionRendererRegistration,
  ActionStyle,
  createActionRenderer,
  IconPlacement,
  rendererClass,
} from "@react-typed-forms/schemas";
import { DefaultActionRendererOptions } from "./rendererOptions";
import { Text } from "react-native";

export function createButtonActionRenderer(
  actionId: string | string[] | undefined,
  options: DefaultActionRendererOptions = {},
): ActionRendererRegistration {
  return createActionRenderer(
    actionId,
    (props: ActionRendererProps, renderer) => {
      const {
        key,
        onClick,
        actionText,
        className,
        style,
        actionId,
        actionData,
        disabled,
        textClass,
        actionStyle,
        inline,
        actionContent,
        busy,
      } = props;
      const busyIcon = props.busy ? options.busyIcon : undefined;
      const stdIcon = props.icon?.name ? props.icon : options.icon;
      const icon = busyIcon ?? stdIcon;
      const stdIconPlacement =
        props.iconPlacement ??
        options.iconPlacement ??
        IconPlacement.BeforeText;
      const busyPlacement =
        props.iconPlacement ??
        options.busyIconPlacement ??
        IconPlacement.ReplaceText;
      const iconPlacement = busyIcon ? busyPlacement : stdIconPlacement;

      const { Button, I } = renderer.html;
      const isLink = actionStyle == ActionStyle.Link;
      const isGroup = actionStyle == ActionStyle.Group;
      const classNames = rendererClass(
        className,
        isLink
          ? options.linkClass
          : isGroup
            ? options.groupClass
            : rendererClass(
                options.buttonClass,
                actionStyle == ActionStyle.Secondary
                  ? options.secondaryClass
                  : options.primaryClass,
              ),
      );

      const textClassNames = rendererClass(
        textClass,
        isLink
          ? options.linkTextClass
          : rendererClass(
              options.textClass,
              actionStyle == ActionStyle.Secondary
                ? options.secondaryTextClass
                : options.primaryTextClass,
            ),
      );

      const iconElement = icon && (
        <I
          iconName={icon.name}
          iconLibrary={icon.library}
          className={rendererClass(
            textClassNames,
            iconPlacement == IconPlacement.BeforeText
              ? options.iconBeforeClass
              : options.iconAfterClass,
          )}
        />
      );

      const textElement =
        actionContent ??
        (actionText && <Text className={textClassNames}>{actionText}</Text>);

      return (
        <Button
          key={key}
          className={classNames}
          textClass={textClassNames}
          disabled={disabled}
          style={style}
          onClick={onClick}
          inline={inline}
          nonTextContent={isGroup}
          title={
            iconPlacement == IconPlacement.ReplaceText ? actionText : undefined
          }
          notWrapInText={options.notWrapInText}
          androidRippleColor={options.androidRippleColor}
        >
          {options.renderContent?.(actionText, actionId, actionData, busy) ?? (
            <>
              {iconPlacement == IconPlacement.BeforeText && iconElement}
              {iconPlacement != IconPlacement.ReplaceText && textElement}
              {iconPlacement != IconPlacement.BeforeText && iconElement}
            </>
          )}
        </Button>
      );
    },
  );
}
