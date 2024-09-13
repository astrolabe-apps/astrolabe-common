import {
  ActionControlDefinition,
  DefaultActionRendererOptions,
  rendererClass,
} from "@react-typed-forms/schemas";
import React from "react";
import { ActionRendererProps, ControlRenderProps } from "./index";

export function createDefaultActionRenderer(
  options?: DefaultActionRendererOptions,
) {
  return (props: ActionRendererProps) => (
    <DefaultButtonAction actionProps={props} options={options ?? {}} />
  );
}

export function DefaultButtonAction({
  actionProps: {
    actionText,
    actionId,
    actionData,
    className,
    style,
    perform,
    disabled,
  },
  options,
}: {
  actionProps: ActionRendererProps;
  options: DefaultActionRendererOptions;
}) {
  return (
    <button
      className={rendererClass(className, options.className)}
      style={style}
      onClick={perform}
      disabled={disabled}
    >
      {options.renderContent?.(actionText, actionId, actionData) ?? actionText}
    </button>
  );
}

export function defaultRenderAction(
  props: ControlRenderProps,
  actionDef: ActionControlDefinition,
) {
  const { formOptions, state } = props;
  const { renderer } = formOptions;
  return (
    <renderer.RenderLayout state={state} formOptions={formOptions}>
      {() => {
        const {
          actionId: { value: actionId },
          actionData: { value: actionData },
          title: { value: actionText },
          styleClass: { value: className },
          style: { value: style },
          disabled: { value: disabled },
        } = state.fields;
        return renderer.renderAction({
          actionId,
          actionData,
          perform: () => formOptions.performAction?.(actionId, actionData),
          actionText,
          className,
          style,
          disabled,
        });
      }}
    </renderer.RenderLayout>
  );
}
