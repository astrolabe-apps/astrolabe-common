import { ControlRenderProps } from "./index";
import {
  DefaultGroupRendererOptions,
  GroupedControlsDefinition,
} from "@react-typed-forms/schemas";
import { schemaDataForForm } from "../index";
import { RenderArrayElements } from "@react-typed-forms/core";

export function defaultRenderGroup(
  props: ControlRenderProps,
  data: GroupedControlsDefinition,
  defaults: DefaultGroupRendererOptions,
) {
  const { formNode, formOptions, state, dataNode } = props;
  const { renderer, RenderForm } = formOptions;
  return (
    <renderer.RenderLayout state={state} formOptions={formOptions}>
      {() => (
        <RenderArrayElements array={formNode.getChildNodes()}>
          {(x) => (
            <RenderForm
              formNode={x}
              dataNode={schemaDataForForm(x, dataNode)}
              formOptions={formOptions}
            />
          )}
        </RenderArrayElements>
      )}
    </renderer.RenderLayout>
  );
}
