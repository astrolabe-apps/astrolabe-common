import React, { Fragment, ReactNode } from "react";
import {
  ActionRendererProps,
  ActionRendererRegistration,
  ActionStyle,
  createActionRenderer,
  IconPlacement,
  IconReference,
  rendererClass,
} from "@react-typed-forms/schemas";

export interface DefaultActionRendererOptions {
  buttonClass?: string;
  primaryClass?: string;
  secondaryClass?: string;
  linkClassName?: string;
  textClass?: string;
  linkTextClass?: string;
  iconBeforeClass?: string;
  iconAfterClass?: string;
  renderContent?: (
    actionText: string,
    actionId: string,
    actionData: any,
  ) => ReactNode;
  icon?: IconReference;
  iconPlacement?: IconPlacement;
}

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
      } = props;
      const icon = props.icon?.name ? props.icon : options.icon;
      const iconPlacement =
        props.iconPlacement ??
        options.iconPlacement ??
        IconPlacement.BeforeText;

      const { Button, I } = renderer.html;
      const isLink = actionStyle == ActionStyle.Link;
      const classNames = rendererClass(
        className,
        isLink
          ? options.linkClassName
          : rendererClass(
              options.buttonClass,
              actionStyle == ActionStyle.Secondary
                ? options.secondaryClass
                : options.primaryClass,
            ),
      );
      const iconElement = icon && (
        <I
          iconName={icon.name}
          iconLibrary={icon.library}
          className={
            iconPlacement == IconPlacement.BeforeText
              ? options.iconBeforeClass
              : options.iconAfterClass
          }
        />
      );
      return (
        <Button
          key={key}
          className={classNames}
          textClass={rendererClass(
            textClass,
            isLink ? options.linkTextClass : options.textClass,
          )}
          disabled={disabled}
          style={style}
          onClick={onClick}
          inline={inline}
          title={
            iconPlacement == IconPlacement.ReplaceText ? actionText : undefined
          }
        >
          {options.renderContent?.(actionText, actionId, actionData) ?? (
            <>
              {iconPlacement == IconPlacement.BeforeText && iconElement}
              {iconPlacement != IconPlacement.ReplaceText && actionText}
              {iconPlacement != IconPlacement.BeforeText && iconElement}
            </>
          )}
        </Button>
      );
    },
  );
}
