import { ControlRenderProps } from "./index";
import {
  CustomDisplay,
  DefaultDisplayRendererOptions,
  DefaultGroupRendererOptions,
  DisplayControlDefinition,
  DisplayDataType,
  getOverrideClass,
  GroupedControlsDefinition,
  HtmlDisplay,
  IconDisplay,
  rendererClass,
  TextDisplay,
} from "@react-typed-forms/schemas";
import clsx from "clsx";
import React from "react";

export function defaultRenderDisplay(
  props: ControlRenderProps,
  definition: DisplayControlDefinition,
  defaults: DefaultDisplayRendererOptions,
) {
  const data = definition.displayData;
  const { formOptions, state } = props;
  const { renderer } = formOptions;
  return (
    <renderer.RenderLayout state={state} formOptions={formOptions}>
      {() => {
        const {
          styleClass: { value: className },
          style: { value: style },
          display: { value: display },
        } = state.fields;
        switch (data.type) {
          case DisplayDataType.Icon:
            return (
              <i
                style={style}
                className={clsx(getOverrideClass(className), display)}
              />
            );
          case DisplayDataType.Text:
            return (
              <div
                style={style}
                className={rendererClass(className, defaults.textClassName)}
              >
                {display}
              </div>
            );
          case DisplayDataType.Html:
            return (
              <div
                style={style}
                className={rendererClass(className, defaults.htmlClassName)}
                dangerouslySetInnerHTML={{
                  __html: display ?? "",
                }}
              />
            );
          case DisplayDataType.Custom:
            return (
              <div>
                Custom display placeholder: {(data as CustomDisplay).customId}
              </div>
            );
          default:
            return <h1>Unknown display type: {data.type}</h1>;
        }
      }}
    </renderer.RenderLayout>
  );
}
